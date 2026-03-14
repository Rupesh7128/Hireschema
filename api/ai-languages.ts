import { createAiGatewayHandler } from './_aiGateway';

export default createAiGatewayHandler({ engine: 'languages', modelEnvKey: 'OPENAI_MODEL_LANGUAGES' });

