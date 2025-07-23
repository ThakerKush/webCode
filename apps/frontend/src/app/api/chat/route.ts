import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import config from "@/config";
import { ChatSDKError } from "@/lib/errors";
import { streamText } from "ai";
import { createStreamableValue } from "ai/rsc";
import { postRequestBody, postRequestBodySchema } from "./schema";

const openRouter = createOpenRouter({
    apiKey: config.OPENROUTERAPIKEY
})
//Now will this work?
async function POST(request: Request){
    let postRequestBody: postRequestBody

    try{
        const json = await request.json()
        postRequestBody = postRequestBodySchema.parse(json) // add zod validation here
    } catch(e){
        return new ChatSDKError('bad_request:api').toResponse()
    }

    const stream = createStreamableValue('')
    const { textStream } = streamText({
        model: openRouter("google/gemini-2.5-pro-preview"),
        prompt: postRequestBody.prompt
    })

    for await (const delta of textStream){
        stream.update(delta)
    }
    stream.done();

    return Response.json({output: stream.value})
}