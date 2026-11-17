import type {
  IExecuteFunctions,
  INodeType,
  INodeTypeDescription,
  INodeExecutionData,
  ILoadOptionsFunctions,
  INodeListSearchResult,
  IDataObject,
} from 'n8n-workflow';

const BASE_URL = 'https://renderly.video/api/v1';

export class Renderly implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Renderly',
    name: 'renderly',
    icon: 'file:renderly.png',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Render videos programmatically with Renderly',
    defaults: {
      name: 'Renderly',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'renderlyApi',
        required: true,
      },
    ],
    properties: [
      // ------ Operation ------
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Create Render',
            value: 'createRender',
            description: 'Start a new video render from a project or template',
            action: 'Create a video render',
          },
          {
            name: 'Get Render Status',
            value: 'getRenderStatus',
            description: 'Check the status of a render job',
            action: 'Get render status',
          },
          {
            name: 'List Projects',
            value: 'listProjects',
            description: 'List your projects with dynamic overlays',
            action: 'List projects',
          },
          {
            name: 'List Templates',
            value: 'listTemplates',
            description: 'List public system templates',
            action: 'List templates',
          },
        ],
        default: 'createRender',
      },

      // ------ Create Render: Source ------
      {
        displayName: 'Render From',
        name: 'source',
        type: 'options',
        options: [
          { name: 'My Project', value: 'project' },
          { name: 'System Template', value: 'template' },
        ],
        default: 'project',
        description: 'Choose whether to render from your own project or a public system template',
        displayOptions: {
          show: { operation: ['createRender'] },
        },
      },

      // ------ Create Render: Project selector ------
      {
        displayName: 'Project',
        name: 'projectId',
        type: 'resourceLocator',
        default: { mode: 'list', value: '' },
        required: true,
        description: 'Select a project with dynamic overlays',
        displayOptions: {
          show: { operation: ['createRender'], source: ['project'] },
        },
        modes: [
          {
            displayName: 'From List',
            name: 'list',
            type: 'list',
            typeOptions: {
              searchListMethod: 'listProjects',
              searchable: true,
            },
          },
          {
            displayName: 'By ID',
            name: 'id',
            type: 'string',
            placeholder: 'e.g. clx1abc123...',
            validation: [
              {
                type: 'regex',
                properties: {
                  regex: '.+',
                  errorMessage: 'Project ID is required',
                },
              },
            ],
          },
        ],
      },

      // ------ Create Render: Template selector ------
      {
        displayName: 'Template',
        name: 'templateId',
        type: 'resourceLocator',
        default: { mode: 'list', value: '' },
        required: true,
        description: 'Select a public system template',
        displayOptions: {
          show: { operation: ['createRender'], source: ['template'] },
        },
        modes: [
          {
            displayName: 'From List',
            name: 'list',
            type: 'list',
            typeOptions: {
              searchListMethod: 'listTemplates',
              searchable: true,
            },
          },
          {
            displayName: 'By ID',
            name: 'id',
            type: 'string',
            placeholder: 'e.g. tmpl_abc123...',
          },
        ],
      },

      // ------ Create Render: Replacements ------
      {
        displayName: 'Replacements',
        name: 'replacements',
        type: 'json',
        default: '{}',
        description:
          'Dynamic variable replacements as a JSON object. Keys are overlay names marked as isDynamic. Example: {"headline": "My Title", "background": "https://example.com/video.mp4"}',
        displayOptions: {
          show: { operation: ['createRender'] },
        },
      },

      // ------ Create Render: Additional Options ------
      {
        displayName: 'Additional Options',
        name: 'additionalOptions',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        displayOptions: {
          show: { operation: ['createRender'] },
        },
        options: [
          {
            displayName: 'Width (px)',
            name: 'width',
            type: 'number',
            default: 0,
            description: 'Video width in pixels. Leave at 0 for project/template default.',
          },
          {
            displayName: 'Height (px)',
            name: 'height',
            type: 'number',
            default: 0,
            description: 'Video height in pixels. Leave at 0 for project/template default.',
          },
          {
            displayName: 'FPS',
            name: 'fps',
            type: 'number',
            default: 0,
            description: 'Frames per second. Leave at 0 for project/template default.',
          },
          {
            displayName: 'Duration In Frames',
            name: 'durationInFrames',
            type: 'number',
            default: 0,
            description: 'Total duration in frames. Leave at 0 for project/template default.',
          },
          {
            displayName: 'Webhook URL',
            name: 'webhookUrl',
            type: 'string',
            default: '',
            description:
              'Optional one-off webhook URL to receive a callback when the render completes or fails. For persistent webhooks, use the Renderly Trigger node instead.',
          },
        ],
      },

      // ------ Get Render Status: Job ID ------
      {
        displayName: 'Job ID',
        name: 'jobId',
        type: 'string',
        required: true,
        default: '',
        description: 'The render job ID to check',
        displayOptions: {
          show: { operation: ['getRenderStatus'] },
        },
      },
    ],
  };

  methods = {
    listSearch: {
      async listProjects(
        this: ILoadOptionsFunctions,
        filter?: string,
      ): Promise<INodeListSearchResult> {
        const response = (await this.helpers.httpRequestWithAuthentication.call(
          this,
          'renderlyApi',
          {
            method: 'GET',
            url: `${BASE_URL}/projects`,
            qs: { dynamic: 'true' },
            json: true,
          },
        )) as { data: { projects: Array<{ id: string; name: string }> } };

        let projects = response.data.projects;
        if (filter) {
          const lowerFilter = filter.toLowerCase();
          projects = projects.filter((p) =>
            p.name.toLowerCase().includes(lowerFilter),
          );
        }

        return {
          results: projects.map((p) => ({
            name: p.name,
            value: p.id,
          })),
        };
      },

      async listTemplates(
        this: ILoadOptionsFunctions,
        filter?: string,
      ): Promise<INodeListSearchResult> {
        const response = (await this.helpers.httpRequestWithAuthentication.call(
          this,
          'renderlyApi',
          {
            method: 'GET',
            url: `${BASE_URL}/templates`,
            json: true,
          },
        )) as {
          data: {
            templates: Array<{
              id: string;
              name: string;
              category: string;
            }>;
          };
        };

        let templates = response.data.templates;
        if (filter) {
          const lowerFilter = filter.toLowerCase();
          templates = templates.filter(
            (t) =>
              t.name.toLowerCase().includes(lowerFilter) ||
              t.category.toLowerCase().includes(lowerFilter),
          );
        }

        return {
          results: templates.map((t) => ({
            name: `${t.name} (${t.category})`,
            value: t.id,
          })),
        };
      },
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const operation = this.getNodeParameter('operation', 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        if (operation === 'createRender') {
          const source = this.getNodeParameter('source', i) as string;
          const replacementsRaw = this.getNodeParameter(
            'replacements',
            i,
            '{}',
          ) as string;
          const replacements =
            typeof replacementsRaw === 'string'
              ? JSON.parse(replacementsRaw)
              : replacementsRaw;
          const options = this.getNodeParameter(
            'additionalOptions',
            i,
            {},
          ) as {
            width?: number;
            height?: number;
            fps?: number;
            durationInFrames?: number;
            webhookUrl?: string;
          };

          const body: Record<string, unknown> = { replacements };

          if (source === 'project') {
            body.projectId = this.getNodeParameter('projectId', i, '', {
              extractValue: true,
            }) as string;
          } else {
            body.templateId = this.getNodeParameter('templateId', i, '', {
              extractValue: true,
            }) as string;
          }

          if (options.width) body.width = options.width;
          if (options.height) body.height = options.height;
          if (options.fps) body.fps = options.fps;
          if (options.durationInFrames)
            body.durationInFrames = options.durationInFrames;
          if (options.webhookUrl) body.webhookUrl = options.webhookUrl;

          const response = await this.helpers.httpRequestWithAuthentication.call(
            this,
            'renderlyApi',
            {
              method: 'POST',
              url: `${BASE_URL}/renders`,
              body,
              json: true,
            },
          );

          returnData.push({ json: (response as { data: IDataObject }).data });
        } else if (operation === 'getRenderStatus') {
          const jobId = this.getNodeParameter('jobId', i) as string;

          const response = await this.helpers.httpRequestWithAuthentication.call(
            this,
            'renderlyApi',
            {
              method: 'GET',
              url: `${BASE_URL}/renders/${jobId}`,
              json: true,
            },
          );

          returnData.push({ json: (response as { data: IDataObject }).data });
        } else if (operation === 'listProjects') {
          const response = await this.helpers.httpRequestWithAuthentication.call(
            this,
            'renderlyApi',
            {
              method: 'GET',
              url: `${BASE_URL}/projects`,
              qs: { dynamic: 'true' },
              json: true,
            },
          );

          const projects = (
            response as { data: { projects: IDataObject[] } }
          ).data.projects;
          for (const project of projects) {
            returnData.push({ json: project });
          }
        } else if (operation === 'listTemplates') {
          const response = await this.helpers.httpRequestWithAuthentication.call(
            this,
            'renderlyApi',
            {
              method: 'GET',
              url: `${BASE_URL}/templates`,
              json: true,
            },
          );

          const templates = (
            response as { data: { templates: IDataObject[] } }
          ).data.templates;
          for (const template of templates) {
            returnData.push({ json: template });
          }
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: (error as Error).message },
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
