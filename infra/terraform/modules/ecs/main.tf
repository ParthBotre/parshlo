/**
 * ECS Fargate cluster running three services behind an ALB:
 *   - api    (NestJS, /v1/*)
 *   - worker (BullMQ workers; no inbound listener)
 *   - web    (Next.js)
 *
 * The api + web services attach to ALB target groups; the worker is
 * tasks-only. All services pull container images from ECR.
 */

variable "name" { type = string }
variable "vpc_id" { type = string }
variable "public_subnet_ids" { type = list(string) }
variable "private_subnet_ids" { type = list(string) }
variable "api_image" { type = string }
variable "web_image" { type = string }
variable "worker_image" { type = string }
variable "container_port_api" {
  type    = number
  default = 4000
}
variable "container_port_web" {
  type    = number
  default = 3000
}
variable "api_desired_count" { type = number, default = 2 }
variable "web_desired_count" { type = number, default = 2 }
variable "worker_desired_count" { type = number, default = 1 }
variable "task_env_api" { type = map(string), default = {} }
variable "task_env_web" { type = map(string), default = {} }
variable "task_env_worker" { type = map(string), default = {} }
variable "tags" { type = map(string), default = {} }

locals {
  base_tags = merge(var.tags, { Project = "parshlo", Module = "ecs" })
}

resource "aws_ecs_cluster" "this" {
  name = "${var.name}-cluster"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  tags = local.base_tags
}

# ---------- ALB ----------

resource "aws_security_group" "alb" {
  name        = "${var.name}-alb-sg"
  vpc_id      = var.vpc_id
  description = "Public HTTPS"

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = local.base_tags
}

resource "aws_lb" "this" {
  name               = "${var.name}-alb"
  load_balancer_type = "application"
  subnets            = var.public_subnet_ids
  security_groups    = [aws_security_group.alb.id]
  idle_timeout       = 60
  tags               = local.base_tags
}

resource "aws_lb_target_group" "api" {
  name        = "${var.name}-api-tg"
  port        = var.container_port_api
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 15
    matcher             = "200"
  }
  tags = local.base_tags
}

resource "aws_lb_target_group" "web" {
  name        = "${var.name}-web-tg"
  port        = var.container_port_web
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/api/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 15
    matcher             = "200"
  }
  tags = local.base_tags
}

# ---------- Services ----------

# Note: task definitions, IAM roles, and listener rules are intentionally
# omitted from this skeleton — they're env-specific (image tag, secrets ARNs,
# CPU/RAM sizing). Wire them per-environment in environments/<env>/main.tf.

output "alb_dns_name" { value = aws_lb.this.dns_name }
output "cluster_name" { value = aws_ecs_cluster.this.name }
output "tg_api_arn" { value = aws_lb_target_group.api.arn }
output "tg_web_arn" { value = aws_lb_target_group.web.arn }
