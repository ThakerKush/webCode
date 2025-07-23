import ChatInput from "@/components/chatBar";
import { PureMessage } from "@/components/messages";
import Image from "next/image";

// export default function Home() {
//   return (
//     // Main Container
//     <div className="flex min-h-screen bg-green-700">
//       {/* Sidebar */}
//       <div className="w-64 bg-red-600 p-4 flex flex-col">
//         This is the side bar
//       </div>
//       {/* Chat Area */}
//       <div className="flex-1 flex flex-col rounded-2xl bg-amber-100">Some message?

//       <form className="w-full max-w-3xl mx-auto px-4 bg-amber-500">
//         <textarea className="w-full rounded"></textarea>
//       </form>
//       </div>
//     </div>
//   );
// }

export default function Home() {
  return (
    // Main Container
    <div className="flex min-h-screen bg-green-700">
      {/* Sidebar */}
      <div className="w-64 bg-red-600 p-4 flex flex-col">
        <div className="bg-black p-2 rounded-lg max-w-3xs">This is the bar?</div>
      </div>

      {/* Chat Area - This needs to contain BOTH messages and form */}
      <div className="flex-1 flex flex-col w-full max-w-3xl">
        {/* Messages */}
        <div className="flex-1 rounded-2xl bg-amber-100 m-4">Some message?</div>

        {/* Form */}
        <form className="w-full max-w-3xl mx-auto px-4 bg-amber-500">
          <textarea className="w-full rounded"></textarea>
        </form>
      </div>
    </div>
  );
}
