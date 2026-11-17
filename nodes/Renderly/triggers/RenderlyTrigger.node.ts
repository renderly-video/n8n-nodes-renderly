import type {
  IWebhookFunctions,
  INodeType,
  INodeTypeDescription,
  IWebhookResponseData,
  IHookFunctions,
} from 'n8n-workflow';

const BASE_URL = 'https://renderly.video/api/v1';

export class RenderlyTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Renderly Trigger',
    name: 'renderlyTrigger',
    icon: 'file:renderly.png',
    group: ['trigger'],
    version: 1,
    subtitle: '={{$parameter["event"]}}',
    description: 'Triggers when a Renderly video render completes or fails',
    defaults: {
      name: 'Renderly Trigger',
    },
    inputs: [],
    outputs: ['main'],
    credentials: [
      {
        name: 'renderlyApi',
        required: true,
      },
    ],
    webhooks: [
      {
        name: 'default',
        httpMethod: 'POST',
        responseMode: 'onReceived',
        path: 'webhook',
      },
    ],
    properties: [
      {
        displayName: 'Event',
        name: 'event',
        type: 'options',
        options: [
          {
            name: 'Render Completed',
            value: 'render.completed',
            description: 'Fires when a video render finishes successfully',
          },
          {
            name: 'Render Failed',
            value: 'render.failed',
            description: 'Fires when a video render fails',
          },
        ],
        default: 'render.completed',
        required: true,
        description: 'The Renderly event to listen for',
      },
    ],
  };

  webhookMethods = {
    default: {
      async checkExists(this: IHookFunctions): Promise<boolean> {
        const webhookData = this.getWorkflowStaticData('node');
        if (!webhookData.webhookId) {
          return false;
        }

        // Verify the webhook still exists on Renderly's side
        try {
          const response = (await this.helpers.httpRequestWithAuthentication.call(
            this,
            'renderlyApi',
            {
              method: 'GET',
              url: `${BASE_URL}/webhooks`,
              json: true,
            },
          )) as { data: { webhooks: Array<{ id: string }> } };

          const exists = response.data.webhooks.some(
            (w) => w.id === webhookData.webhookId,
          );

          if (!exists) {
            delete webhookData.webhookId;
            return false;
          }

          return true;
        } catch {
          return false;
        }
      },

      async create(this: IHookFunctions): Promise<boolean> {
        const webhookUrl = this.getNodeWebhookUrl('default') as string;
        const event = this.getNodeParameter('event') as string;

        const response = (await this.helpers.httpRequestWithAuthentication.call(
          this,
          'renderlyApi',
          {
            method: 'POST',
            url: `${BASE_URL}/webhooks`,
            body: {
              url: webhookUrl,
              events: [event],
            },
            json: true,
          },
        )) as { data: { id: string } };

        const webhookData = this.getWorkflowStaticData('node');
        webhookData.webhookId = response.data.id;
        return true;
      },

      async delete(this: IHookFunctions): Promise<boolean> {
        const webhookData = this.getWorkflowStaticData('node');

        if (!webhookData.webhookId) {
          return true;
        }

        try {
          await this.helpers.httpRequestWithAuthentication.call(
            this,
            'renderlyApi',
            {
              method: 'DELETE',
              url: `${BASE_URL}/webhooks`,
              qs: { id: webhookData.webhookId as string },
              json: true,
            },
          );
        } catch {
          // Webhook may have already been deleted — that's fine
        }

        delete webhookData.webhookId;
        return true;
      },
    },
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const body = this.getBodyData() as {
      event?: string;
      timestamp?: string;
      data?: {
        jobId?: string;
        status?: string;
        outputUrl?: string;
        errorMessage?: string;
        creditsUsed?: number;
        duration?: number;
        completedAt?: string;
        failedAt?: string;
        fileSize?: number;
      };
    };

    const data = body.data ?? {};

    return {
      workflowData: [
        this.helpers.returnJsonArray({
          event: body.event,
          timestamp: body.timestamp,
          jobId: data.jobId,
          status: data.status,
          outputUrl: data.outputUrl,
          errorMessage: data.errorMessage,
          creditsUsed: data.creditsUsed,
          duration: data.duration,
          fileSize: data.fileSize,
          completedAt: data.completedAt,
          failedAt: data.failedAt,
        }),
      ],
    };
  }
}
