/**
 * Persistent stores: RDS PostgreSQL (Multi-AZ in prod), ElastiCache Redis,
 * and the two production S3 buckets (KYC documents + invoices).
 *
 * All buckets are private with SSE-S3, versioning, and a lifecycle rule
 * that transitions older invoice PDFs to Glacier Deep Archive after 1 year
 * (required by GST record retention).
 */

variable "name" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "db_instance_class" {
  type    = string
  default = "db.t4g.medium"
}
variable "db_multi_az" {
  type    = bool
  default = false
}
variable "redis_node_type" {
  type    = string
  default = "cache.t4g.small"
}
variable "redis_num_nodes" {
  type    = number
  default = 2
}
variable "tags" {
  type    = map(string)
  default = {}
}

locals {
  base_tags = merge(var.tags, { Project = "parshlo", Module = "data" })
}

# ---------- RDS PostgreSQL ----------

resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-db-subnets"
  subnet_ids = var.private_subnet_ids
  tags       = local.base_tags
}

resource "aws_security_group" "db" {
  name        = "${var.name}-db-sg"
  vpc_id      = var.vpc_id
  description = "Postgres ingress from VPC"

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = local.base_tags
}

resource "random_password" "db" {
  length  = 32
  special = false
}

resource "aws_db_instance" "this" {
  identifier             = "${var.name}-postgres"
  engine                 = "postgres"
  engine_version         = "16.4"
  instance_class         = var.db_instance_class
  allocated_storage      = 50
  max_allocated_storage  = 500
  storage_encrypted      = true
  storage_type           = "gp3"
  username               = "parshlo"
  password               = random_password.db.result
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.db.id]
  multi_az               = var.db_multi_az
  backup_retention_period = 14
  deletion_protection    = true
  skip_final_snapshot    = false
  final_snapshot_identifier = "${var.name}-final-${formatdate("YYYYMMDD", timestamp())}"
  performance_insights_enabled = true
  monitoring_interval    = 60
  tags                   = local.base_tags

  lifecycle {
    ignore_changes = [final_snapshot_identifier]
  }
}

# ---------- ElastiCache Redis ----------

resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.name}-redis-subnets"
  subnet_ids = var.private_subnet_ids
}

resource "aws_security_group" "redis" {
  name        = "${var.name}-redis-sg"
  vpc_id      = var.vpc_id
  description = "Redis ingress from VPC"

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = local.base_tags
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id       = "${var.name}-redis"
  description                = "Parshlo Redis (BullMQ + caching)"
  engine                     = "redis"
  engine_version             = "7.1"
  node_type                  = var.redis_node_type
  num_cache_clusters         = var.redis_num_nodes
  automatic_failover_enabled = var.redis_num_nodes > 1
  subnet_group_name          = aws_elasticache_subnet_group.this.name
  security_group_ids         = [aws_security_group.redis.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  tags                       = local.base_tags
}

# ---------- S3 buckets ----------

resource "aws_s3_bucket" "kyc" {
  bucket = "${var.name}-kyc-${random_id.suffix.hex}"
  tags   = merge(local.base_tags, { Sensitivity = "PII" })
}

resource "aws_s3_bucket" "invoices" {
  bucket = "${var.name}-invoices-${random_id.suffix.hex}"
  tags   = merge(local.base_tags, { Compliance = "GST" })
}

resource "random_id" "suffix" {
  byte_length = 4
}

resource "aws_s3_bucket_server_side_encryption_configuration" "kyc" {
  bucket = aws_s3_bucket.kyc.id
  rule { apply_server_side_encryption_by_default { sse_algorithm = "AES256" } }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "invoices" {
  bucket = aws_s3_bucket.invoices.id
  rule { apply_server_side_encryption_by_default { sse_algorithm = "AES256" } }
}

resource "aws_s3_bucket_versioning" "kyc" {
  bucket = aws_s3_bucket.kyc.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_versioning" "invoices" {
  bucket = aws_s3_bucket.invoices.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_lifecycle_configuration" "invoices" {
  bucket = aws_s3_bucket.invoices.id

  rule {
    id     = "transition-to-glacier"
    status = "Enabled"

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }

    # GST law: keep invoices for 8 years
    expiration { days = 365 * 8 }
  }
}

resource "aws_s3_bucket_public_access_block" "kyc" {
  bucket                  = aws_s3_bucket.kyc.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "invoices" {
  bucket                  = aws_s3_bucket.invoices.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

output "db_endpoint" { value = aws_db_instance.this.address }
output "db_password" {
  value     = random_password.db.result
  sensitive = true
}
output "redis_primary_endpoint" { value = aws_elasticache_replication_group.this.primary_endpoint_address }
output "s3_bucket_kyc" { value = aws_s3_bucket.kyc.id }
output "s3_bucket_invoices" { value = aws_s3_bucket.invoices.id }
