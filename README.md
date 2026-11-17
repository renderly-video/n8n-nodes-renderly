# n8n-nodes-renderly

An [n8n](https://n8n.io) community node for [Renderly](https://renderly.video), a video rendering API. Send a template and your data from a workflow, and get a finished MP4 back.

The package has two nodes:

- **Renderly** creates renders and reads their status.
- **Renderly Trigger** starts a workflow when a render finishes or fails.

## Install

**n8n Cloud or the n8n editor:** open Settings, then Community Nodes, then Install. Enter `n8n-nodes-renderly`.

**Self-hosted:** run this in your n8n installation directory, then restart n8n.

```bash
npm install n8n-nodes-renderly
```

## Credentials

1. Create an API key in your Renderly account. See the [API documentation](https://renderly.video/docs).
2. In n8n, create a **Renderly API** credential and paste the key.

n8n sends the key as `Authorization: Bearer <key>` and checks it with `POST https://renderly.video/api/v1/auth/verify`.

## Renderly node

| Operation | What it does |
|-----------|--------------|
| Create Render | Starts a render from one of your projects or from a public template |
| Get Render Status | Returns the status, progress and output URL of a render job |
| List Projects | Lists your projects that have dynamic overlays |
| List Templates | Lists the public templates |

### Create Render

Choose **My Project** or **System Template** in **Render From**. Pick the item from the list, or enter its ID.

Put your values in the **Replacements** field as a JSON object. Each key is the name of an overlay that has `isDynamic` set. You can build the object with n8n expressions.

```json
{
  "headline": "{{ $json.title }}",
  "background": "https://example.com/background.mp4"
}
```

Under **Additional Options** you can set the width, the height, the frame rate, the duration in frames, and a webhook URL for this one render.

The node returns the job ID and the render status. Renders use credits from your Renderly account.

### Get Render Status

Enter a job ID. The node returns the status, the progress, the output URL and the file size. If the render failed, it also returns the error message.

## Renderly Trigger node

The trigger registers a webhook with Renderly when you activate the workflow. It removes the webhook when you deactivate the workflow.

| Event | Fires when |
|-------|------------|
| Render Completed | A render finishes |
| Render Failed | A render fails |

The payload includes the event name, the job ID, the status and the output URL. A failed render includes the error message.

## Example workflow

1. A **Schedule Trigger** or a **Webhook** node supplies the data.
2. **Renderly** (Create Render) starts the video with that data.
3. **Renderly Trigger** (Render Completed) runs a second workflow that posts or stores the video.

## Links

- [Renderly](https://renderly.video)
- [n8n integration page](https://renderly.video/integrations/n8n)
- [API documentation](https://renderly.video/docs)
- [npm package](https://www.npmjs.com/package/n8n-nodes-renderly)
- Support: support@renderly.video

## License

[MIT](LICENSE)
