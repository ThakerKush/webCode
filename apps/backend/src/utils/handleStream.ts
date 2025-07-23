import { type Writable, type Readable, type Duplex, PassThrough } from "stream";

export interface HandleStreamOptions {
  isTTY?: boolean;
  stdoutWriter?: Writable;
  stderrWriter?: Writable;

  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;

  collect?: boolean;
  doneMarker?: string;
  abortSignal?: AbortSignal;
}

export async function handleStream(
  stream: Duplex | NodeJS.ReadWriteStream,
  opts: HandleStreamOptions
): Promise<{ stdout?: string; stderr?: string; exitCode?: number }> {
  return new Promise((resolve, reject) => {
    const {
      isTTY,
      stdoutWriter,
      stderrWriter,
      onStdout,
      onStderr,
      collect,
      doneMarker,
      abortSignal,
    } = opts;

    let collectedStdout = "";
    let collectedStderr = "";
    let markerDetected = false;
    let exitCode: number | undefined;

    const stdout = new PassThrough();
    const stderr = new PassThrough();

    if (isTTY) {
      stream.pipe(stdout); //Send everything
    } else {
      stream.on("data", (chunk: Buffer) => {
        let offset = 0;
        while (offset + 8 <= chunk.length) {
          const type = chunk[offset];
          const len = chunk.readUInt32BE(offset + 4);
          const payloadStart = offset + 8;
          const payloadEnd = payloadStart + len;
          const payload = chunk.subarray(payloadStart, payloadEnd);
          if (type === 1) stdout.write(payload);
          else if (type === 2) stderr.write(payload);
          offset = payloadEnd;
        }
      });
    }
    stdout.on("data", (b: Buffer) => {
      const text = b.toString();
      stdoutWriter?.write(b);
      onStdout?.(text);
      if (collect) collectedStdout += text;

      if (doneMarker && !markerDetected) {
        if (doneMarker && !markerDetected) {
          const markerIndex = collectedStdout.indexOf(doneMarker);
          if (markerIndex !== -1) {
            const afterMarker = collectedStdout.slice(
              markerIndex + doneMarker.length
            );
            const match = afterMarker.match(/^(\d+)/);
            if (match) {
              exitCode = parseInt(match[1], 10);
              // Remove marker and exit code from output
              collectedStdout = collectedStdout.slice(0, markerIndex);
              markerDetected = true;
              resolve({
                stdout: collectedStdout,
                stderr: collectedStderr,
                exitCode,
              });
            }
          }
        }
      }
    });
    stderr.on("data", (b: Buffer) => {
      const text = b.toString();
      stderrWriter?.write(b);
      onStderr?.(text);
      if (collect) collectedStderr += text;
    });
    // 3) Promise completion & cleanup
    stream.on("end", () => {
      if (!markerDetected) {
        stdout.destroy();
        stderr.destroy();
        if (!collect) {
          resolve({});
        } else {
          resolve({ stdout: collectedStdout, stderr: collectedStderr });
        }
      }
    });

    stream.on("error", (error) => {
      stdout.destroy();
      stderr.destroy();
      reject(error);
    });

    // Allow external abort
    if (abortSignal) {
      abortSignal.addEventListener(
        "abort",
        () => {
          (stream as Duplex).destroy(new Error("Aborted"));
        },
        { once: true }
      );
    }
  });
}
