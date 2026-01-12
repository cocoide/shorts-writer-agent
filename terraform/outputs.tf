output "project_id" {
  description = "Vercel Project ID"
  value       = vercel_project.shorts_writer_agent.id
}

output "project_url" {
  description = "Vercel Project URL"
  value       = "https://${vercel_project.shorts_writer_agent.name}.vercel.app"
}
