import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class RenderlyApi implements ICredentialType {
  name = 'renderlyApi';
  displayName = 'Renderly API';
  documentationUrl = 'https://renderly.video/integrations/n8n';

  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description:
        'Your Renderly API key. Generate one from Settings → API Keys in your Renderly dashboard.',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.apiKey}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: 'https://renderly.video/api/v1',
      url: '/auth/verify',
      method: 'POST',
    },
  };
}
