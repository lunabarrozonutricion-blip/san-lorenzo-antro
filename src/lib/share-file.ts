export type ShareFileResult =
  | {
      status: "shared";
    }
  | {
      status: "cancelled";
    }
  | {
      status: "unsupported";
      message: string;
    };

type ShareFileInput = {
  blob: Blob;
  fileName: string;
  title?: string;
  text?: string;
};

export async function shareFile({
  blob,
  fileName,
  title,
  text,
}: ShareFileInput): Promise<ShareFileResult> {
  if (
    typeof navigator ===
      "undefined" ||
    typeof navigator.share !==
      "function"
  ) {
    return {
      status: "unsupported",
      message:
        "Este dispositivo no permite compartir archivos directamente.",
    };
  }

  const file = new File(
    [blob],
    fileName,
    {
      type:
        blob.type ||
        "application/octet-stream",
    },
  );

  if (
    typeof navigator.canShare ===
      "function" &&
    !navigator.canShare({
      files: [file],
    })
  ) {
    return {
      status: "unsupported",
      message:
        "Este navegador no permite compartir este archivo directamente.",
    };
  }

  try {
    await navigator.share({
      title,
      text,
      files: [file],
    });

    return {
      status: "shared",
    };
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name ===
        "AbortError"
    ) {
      return {
        status:
          "cancelled",
      };
    }

    throw error;
  }
}
