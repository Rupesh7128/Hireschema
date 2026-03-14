import { createAiGatewayHandler } from './_aiGateway';

export default createAiGatewayHandler({ engine: 'gaps', modelEnvKey: 'OPENAI_MODEL_GAPS' });

