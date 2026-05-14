/**
 * VPC with public + private subnets across N availability zones.
 * NAT gateways for outbound from private subnets.
 *
 * Defaults to /16 CIDR. Override via `cidr_block`.
 */

variable "name" { type = string }
variable "cidr_block" {
  type    = string
  default = "10.40.0.0/16"
}
variable "azs" {
  description = "Availability zones to use (e.g. [\"ap-south-1a\", \"ap-south-1b\", \"ap-south-1c\"])"
  type        = list(string)
}
variable "single_nat" {
  description = "Use a single NAT gateway across AZs (dev/staging cost optimization). Prod should be false."
  type        = bool
  default     = false
}
variable "tags" {
  type    = map(string)
  default = {}
}

locals {
  num_azs           = length(var.azs)
  public_subnet_cidrs  = [for i in range(local.num_azs) : cidrsubnet(var.cidr_block, 4, i)]
  private_subnet_cidrs = [for i in range(local.num_azs) : cidrsubnet(var.cidr_block, 4, i + 8)]
  base_tags = merge(var.tags, { Project = "parshlo", Module = "network" })
}

resource "aws_vpc" "this" {
  cidr_block           = var.cidr_block
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags                 = merge(local.base_tags, { Name = "${var.name}-vpc" })
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  tags   = merge(local.base_tags, { Name = "${var.name}-igw" })
}

resource "aws_subnet" "public" {
  count                   = local.num_azs
  vpc_id                  = aws_vpc.this.id
  cidr_block              = local.public_subnet_cidrs[count.index]
  availability_zone       = var.azs[count.index]
  map_public_ip_on_launch = true
  tags = merge(local.base_tags, {
    Name = "${var.name}-public-${count.index}"
    Tier = "public"
  })
}

resource "aws_subnet" "private" {
  count             = local.num_azs
  vpc_id            = aws_vpc.this.id
  cidr_block        = local.private_subnet_cidrs[count.index]
  availability_zone = var.azs[count.index]
  tags = merge(local.base_tags, {
    Name = "${var.name}-private-${count.index}"
    Tier = "private"
  })
}

resource "aws_eip" "nat" {
  count  = var.single_nat ? 1 : local.num_azs
  domain = "vpc"
  tags   = merge(local.base_tags, { Name = "${var.name}-nat-${count.index}" })
}

resource "aws_nat_gateway" "this" {
  count         = var.single_nat ? 1 : local.num_azs
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  tags          = merge(local.base_tags, { Name = "${var.name}-nat-${count.index}" })
  depends_on    = [aws_internet_gateway.this]
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }
  tags = merge(local.base_tags, { Name = "${var.name}-rt-public" })
}

resource "aws_route_table_association" "public" {
  count          = local.num_azs
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  count  = local.num_azs
  vpc_id = aws_vpc.this.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.this[var.single_nat ? 0 : count.index].id
  }
  tags = merge(local.base_tags, { Name = "${var.name}-rt-private-${count.index}" })
}

resource "aws_route_table_association" "private" {
  count          = local.num_azs
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

output "vpc_id" { value = aws_vpc.this.id }
output "public_subnet_ids" { value = aws_subnet.public[*].id }
output "private_subnet_ids" { value = aws_subnet.private[*].id }
