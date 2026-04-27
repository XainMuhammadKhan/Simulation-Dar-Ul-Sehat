Deployment guide — Frontend + .NET backend

Local run (development)

1. Backend (.NET API)

Open PowerShell in the `backend/DLSimulator.API` folder and run:

```powershell
cd backend\DLSimulator.API
dotnet build
dotnet run
```

By default the API listens on https://localhost:5001 and http://localhost:5000 (check console output).

2. Frontend (Vite)

Open a terminal in `simulator-project` and run:

```bash
cd simulator-project
npm install
npm run dev
```

The Vite dev server proxies `/api` to `http://localhost:5000` (see `vite.config.js`). If your backend uses different ports, either update `vite.config.js` or set `VITE_API_URL` in a `.env` file at project root, e.g:

```
VITE_API_URL=http://localhost:5000
```

Production build & hosting

- Frontend: run `npm run build` in `simulator-project` and deploy the generated `dist/` to Vercel, Netlify, or Render Static Sites.
- Backend: build and publish the ASP.NET Core app and deploy to Render (Web Service), Azure App Service, or any container host.

Hosting notes

- Vercel/Netlify: good for the frontend static site. Not recommended for hosting a persistent .NET backend.
- Render: supports both static sites (frontend) and Web Services (backend) and is simplest for this mixed stack.
- Azure App Service: fully supported for .NET apps and works well with a static frontend on Azure Static Web Apps or other static hosts.

Production configuration

- Set the frontend `VITE_API_URL` to the backend base URL at deploy time.
- Ensure the backend CORS list includes the frontend origin.
- Use HTTPS endpoints and set an environment variable for any secrets.

Optional improvements for grading

- Extend the backend to optionally return per-customer `table` and `ganttChart` when requested (useful for graphs and tables).
- Add automated end-to-end tests (e.g., Playwright) that start the backend, run the frontend build, and POST a sample request to verify the response contract.
- Add CI workflow to build both frontend and backend and run tests on PRs.
