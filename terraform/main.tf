terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.0"
    }
  }
}

provider "vercel" {
  api_token = var.vercel_api_token
}

# Vercel プロジェクト作成
resource "vercel_project" "shorts_writer_agent" {
  name      = "shorts-writer-agent"
  framework = "nextjs"

  git_repository = {
    type = "github"
    repo = "cocoide/shorts-writer-agent"
  }
}

# 環境変数: ANTHROPIC_API_KEY
resource "vercel_project_environment_variable" "anthropic_api_key" {
  project_id = vercel_project.shorts_writer_agent.id
  key        = "ANTHROPIC_API_KEY"
  value      = var.anthropic_api_key
  target     = ["production", "preview", "development"]
}
