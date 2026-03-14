import { createAiGatewayHandler } from './_aiGateway';

export default createAiGatewayHandler({ engine: 'interview', modelEnvKey: 'OPENAI_MODEL_INTERVIEW' });

