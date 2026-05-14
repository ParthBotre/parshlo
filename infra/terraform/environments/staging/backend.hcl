bucket         = "parshlo-terraform-state-REPLACE_WITH_ACCOUNT_ID"
key            = "staging/terraform.tfstate"
region         = "ap-south-1"
dynamodb_table = "parshlo-terraform-locks"
encrypt        = true
