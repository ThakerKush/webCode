import { UIMessage } from "ai";
import ChatInput from "./chatBar";
import { PreviewMessage, PureMessage } from "./messages";

export function Chat({
    id,
    chatId,
    initialMessages,
    autoResume,
}: {
    id: string,
    chatId: string,
    initialMessages: Array<UIMessage>,
    autoResume: boolean
}) {
   return(
    <div>
        <div>
            {initialMessages.map((message) => (
                <PureMessage key={message.id} chatId={chatId} message={message} />
            ))}
        </div>
        <div>
            <PreviewMessage chatId={chatId} message={initialMessages[initialMessages.length - 1]} />
        </div>
        <ChatInput />
    </div>
   )
}