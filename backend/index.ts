const server = Bun.serve({
  port: 3000,
  routes: {
    "/": () => new Response('Bun!'),

    "/jobs": () => Response.json({status:200, body: [
      {id: 1, name: "Testing", description: "This is a test"},
      {id: 2, name: "Testing 2", description: "This is another test"},
    ]}),

    "/jobs/:id": (req) => {
      const jobs = [
        {id: 1, name: "Testing", description: "This is a test"},
        {id: 2, name: "Testing 2", description: "This is another test"},
      ];
      const job = jobs.find(j => j.id === Number(req.params.id));
      if (!job) return Response.json({message: "Job not found"}, {status: 404});
      return Response.json({body: job}, {status: 200});
    }
  }
});

console.log(`Listening on ${server.url}`);
