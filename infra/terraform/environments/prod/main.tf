terraform {
  required_version = ">= 1.9.0"
  backend "s3" {}
}

provider "aws" {
  region = "ap-south-1"
  default_tags {
    tags = {
      Project     = "parshlo"
      Environment = "production"
      ManagedBy   = "terraform"
    }
  }
}

module "network" {
  source     = "../../modules/network"
  name       = "parshlo-prod"
  cidr_block = "10.30.0.0/16"
  azs        = ["ap-south-1a", "ap-south-1b", "ap-south-1c"]
  single_nat = false
}

module "data" {
  source             = "../../modules/data"
  name               = "parshlo-prod"
  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids
  db_instance_class  = "db.r6g.large"
  db_multi_az        = true
  redis_node_type    = "cache.r6g.large"
  redis_num_nodes    = 3
}

module "ecs" {
  source              = "../../modules/ecs"
  name                = "parshlo-prod"
  vpc_id              = module.network.vpc_id
  public_subnet_ids   = module.network.public_subnet_ids
  private_subnet_ids  = module.network.private_subnet_ids
  api_image           = var.api_image
  web_image           = var.web_image
  worker_image        = var.worker_image
  api_desired_count   = 4
  web_desired_count   = 4
  worker_desired_count = 2
}

variable "api_image" { type = string }
variable "web_image" { type = string }
variable "worker_image" { type = string }
