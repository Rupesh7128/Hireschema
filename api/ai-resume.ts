import { createAiGatewayHandler } from './_aiGateway';

export default createAiGatewayHandler({ engine: 'resume', modelEnvKey: 'OPENAI_MODEL_RESUME' });

