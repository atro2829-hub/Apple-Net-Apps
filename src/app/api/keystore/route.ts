import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";

const KEYSTORE_PATH = "/home/z/my-project/keystore/apple-net.keystore";
const KEYSTORE_PASSWORD = "applenet2026";
const KEY_ALIAS = "apple-net";

export async function GET() {
  try {
    // Check if keystore already exists
    if (!existsSync(KEYSTORE_PATH)) {
      // Create the keystore directory if it doesn't exist
      const keystoreDir = dirname(KEYSTORE_PATH);
      if (!existsSync(keystoreDir)) {
        mkdirSync(keystoreDir, { recursive: true });
      }

      // Generate a new keystore using keytool
      const keytoolCommand = `keytool -genkeypair -v \
        -keystore ${KEYSTORE_PATH} \
        -alias ${KEY_ALIAS} \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -storepass ${KEYSTORE_PASSWORD} \
        -keypass ${KEYSTORE_PASSWORD} \
        -dname "CN=Apple Net, OU=Apple Net, O=Apple Net, L=Aden, ST=Aden, C=YE"`;

      execSync(keytoolCommand, { stdio: "pipe" });
    }

    // Extract SHA1 and SHA256 fingerprints using keytool
    const listCommand = `keytool -list -v \
      -keystore ${KEYSTORE_PATH} \
      -alias ${KEY_ALIAS} \
      -storepass ${KEYSTORE_PASSWORD} \
      -keypass ${KEYSTORE_PASSWORD}`;

    const output = execSync(listCommand, { encoding: "utf-8", stdio: "pipe" });

    // Parse SHA1 and SHA256 from the keytool output
    const sha1Match = output.match(/SHA1:\s+([A-F0-9:]+)/i);
    const sha256Match = output.match(/SHA256:\s+([A-F0-9:]+)/i);

    const sha1 = sha1Match ? sha1Match[1] : null;
    const sha256 = sha256Match ? sha256Match[1] : null;

    if (!sha1 || !sha256) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to extract SHA fingerprints from keystore",
          rawOutput: output,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sha1,
      sha256,
      keystorePath: KEYSTORE_PATH,
      alias: KEY_ALIAS,
    });
  } catch (error) {
    console.error("Keystore API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Keystore operation failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
