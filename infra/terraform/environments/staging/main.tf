terraform {
  required_version = ">= 1.9.0"
  backend "s3" {} # initialized via backend.hcl
}

provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Project     = "parshlo"
      Environment = "staging"
      ManagedBy   = "terraform"
    }
  }
}

variable "region" {
  type    = string
  default = "ap-south-1"
}

variable "azs" {
  type    = list(string)
  default = ["ap-south-1a", "ap-south-1b", "ap-south-1c"]
}

module "network" {
  source     = "../../modules/network"
  name       = "parshlo-staging"
  cidr_block = "10.40.0.0/16"
  azs        = var.azs
  single_nat = true
}

module "data" {
  source             = "../../modules/data"
  name               = "parshlo-staging"
  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids
  db_instance_class  = "db.t4g.medium"
  db_multi_az        = false
  redis_node_type    = "cache.t4g.small"
  redis_num_nodes    = 2
}

module "ecs" {
  source              = "../../modules/ecs"
  name                = "parshlo-staging"
  vpc_id              = module.network.vpc_id
  public_subnet_ids   = module.network.public_subnet_ids
  private_subnet_ids  = module.network.private_subnet_ids
  api_image           = var.api_image
  web_image           = var.web_image
  worker_image        = var.worker_image
  api_desired_count   = 2
  web_desired_count   = 2
  worker_desired_count = 1
}

variable "api_image" { type = string }
variable "web_image" { type = string }
variable "worker_image" { type = string }

output "alb" { value = module.ecs.alb_dns_name }
output "db_host" {
  value     = module.data.db_endpoint
  sensitive = true
}
output "redis_host" {
  value     = module.data.redis_primary_endpoint
  sensitive = true
}
