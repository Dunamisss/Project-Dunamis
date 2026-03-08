# Render Setup

You do not need to delete your current Render project unless it is clearly the wrong repo or something you no longer use.

The easiest option is:

1. Open your existing Render account.
2. Click `New +`.
3. Choose `Blueprint`.
3. Let Render read the `render.yaml` file in this repo.
4. Add only one secret by hand:
   - `OPENROUTER_API_KEY`
5. Deploy.

That is it for the backend.

What `render.yaml` already sets for you:

- `npm install`
- `npm start`
- free plan
- health check path
- `OPTIMIZER_PROVIDER=openrouter`
- `OPENROUTER_MODEL=openrouter/free`
- `CORS_ORIGIN=*`

When Render finishes, copy the backend URL. It will look something like:

- `https://your-service-name.onrender.com`

Send me that URL and I will handle the next step.

Notes:

- The first request can be slow on Render free because the service sleeps when idle.
- Do not send your API key to me.
