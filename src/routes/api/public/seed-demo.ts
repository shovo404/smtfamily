import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/api/public/seed-demo")({
  server: {
    handlers: {
      // Deliberately disabled: a public route must never create known admin accounts.
      GET: async () => new Response("Not found", { status: 404 }),
    },
  },
})
