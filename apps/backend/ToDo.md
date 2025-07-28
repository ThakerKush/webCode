---
Agent:

1. More structured workflow

Planner Agent <TODO> --> Executer Agent <EXECUTE TOOL>

---

1. Workspace storage and fetching
2. Todo list in agent
3. UI --> Model selection, chat, render workspace, etc
4. Fix service code to be proper

---

Archiving a workspace: -> big one

1. The container name is the same as the projectId

Server Refactor:

1. /agent/run: Get the projectId --> Load workspace --> Run agent < with async local storage context > --> Store messages --> Serve result
2. Get the loaders working, load the app before running the server

imageName="code-workspace:latestV2

Get workspace back after archiving

/agent/run --> 1. Create workspace < getOrCreateWorkspace > --> 2. Start the agent

Create workspace:

1. Inset into project table
   get a s3 storage link --> project has an s3 storage link

CRUD Routes for Projects --> WHY??

Workspace Created --> Agent Runs --> Workspace Updated --> Workspace Saved

Agent ALWAYS requires a workspace

/chat/:
Initial Prompt
Setup the workspace
WorkSpaceInfo --> Be in an in memory map < dies every 10 mins >

/chat/<chatId>
type smth

/agent/inoke:
Prompt, userId, chatId
extract projectId from chatId --> db.select()
if(workspace in map){
context.run(workspaceinfo, ()=> agent)
}else{
getWorkspace(projectId, userId){
const result = db.select().project().where(eq(projectId, project.uuid))
if(result.status === "active"){
const container = await docker.getContainer(proejctId)
}else{
workspaceInfo = restoreFromS3(projectId)
}
context.run(workspaceInfo, ()=> agent)
}
}

---

---

agent:

1. fetch message from db
2. onFinish(()=> StoreMessagesDb(meessages))

MessageQueue:
Frontend -->

In export container wait for s3 to upload then delete the image, doing it right after returning migth lead to data loss

WORKSPACE MANAGER CANNOT THROW ERRORS 
---

OrCreate --> getWorkspace --> Restoring OR Just getting

---

serve(
{
fetch: server.fetch,
port: 3001,
},
(info) => {
console.log(`Server is running on http://localhost:${info.port}`);
}
);

---

.post(
"/agent/run",
zValidator(
"json",
z.object({
userId: z.number(),
chatId: z.number(),
projectId: z.string().optional(),
prompt: z.string(),
})
),
async (c) => {
try {
const db = await app.getDb();
const { userId, chatId, prompt } = c.req.valid("json");
let projectId = c.req.valid("json").projectId;
const imageName = "code-workspace:latestV2";
const docker = await app.getDocker();
if (!projectId) {
projectId = uuidv4();
const projectResult = await db.createProject(
projectId,
userId,
chatId
);
if (!projectResult.ok) {
console.error("Project creation error");
return c.json(
{
Message: "Project Creation failed",
error: projectResult.error,
},
500
);
}
}
const container = await docker.getOrCreateWorkspace(
projectId,
userId,
imageName
); // very hacky solution for now, just ship
if (!container.ok) {
console.error("Can't get container", container.error);
return c.json({
Message: "Failed to fetch container for workspace",
error: container.error.message,
});
}

        const context: SessionContext = {
          projectId: projectId,
          workspaceInfo: container.value,
        };
        // get the messages from the db, consider adding message to context as of now there is no need
        const messageResult = await db.getMessages(userId, chatId);
        if (!messageResult.ok) {
          console.error("Failed to get messages", messageResult.error);
          return c.json({
            Message: "Failed to get messages",
            error: messageResult.error,
          });
        }
        const message = convertModelMessage(messageResult.value);
        //; Run the agent with the session context
        let runComman;
        const result = await sessionContext.run(context, async () => {
          const result = await generateText({
            model: registery.languageModel("openRouter:qwen/qwen3-coder"),

            system:
              "You are a coding agent, use the tools given to you to complete user tasks, for more complex tasks use a todo list to track your progress",
            tools: {
              // ls,
              // cd,
              read,
              write,
              edit,
              // todoWrite,
              // todoRead,
              terminal,
              fin,
              // Remaining tools: git
            },
            // toolChoice: "required",
            stopWhen: stepCountIs(100),
            prompt: prompt,
            //when the stream is done run the serve command in the container
          });
          //run the serve command in the container)
          logger.info(context.runCommand, context.buildCommand);

          return result;
        });
        return c.json({
          Message: "Agent run successful",
          result: result,
        });
        // after this build and run the project --> on failure
      } catch (error) {
        console.error("unexpectedError", error);
        return c.json({
          Message: "Agent failed to run",
          error: error,
        });
      }
    }

)
