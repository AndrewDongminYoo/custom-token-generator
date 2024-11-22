import admin, { ServiceAccount } from "firebase-admin";
import axios, { AxiosResponse } from "axios";
import { APIGatewayProxyHandler } from "aws-lambda";
import { KakaoUser } from "./handler.d";

console.debug(process.env.FIREBASE_SERVICE_ACCOUNT);

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT!,
) as ServiceAccount;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const handler: APIGatewayProxyHandler = async (event) => {
  // Base64 디코딩
  const decodedString = Buffer.from(event.body!, "base64").toString("utf-8");

  console.debug(`Event -> ${decodedString}`);
  const accessToken = decodedString.substring("accessToken=".length);

  console.log(accessToken);
  if (!accessToken) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Kakao access token is required" }),
    };
  }

  try {
    // Kakao ID token 검증
    const kakaoUser = await verifyKakaoAccessToken(accessToken);

    console.log(kakaoUser);
    // Firebase Custom Token 생성
    const customToken: string = await admin
      .auth()
      .createCustomToken(kakaoUser.uid);

    console.log(customToken);
    return {
      statusCode: 200,
      body: JSON.stringify({ token: customToken, user: kakaoUser }),
    };
  } catch (error) {
    console.error("Error creating Firebase Custom Token:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};

async function verifyKakaoAccessToken(
  accessToken: string,
): Promise<KakaoUser & { uid: `kakao:${KakaoUser["id"]}` }> {
  const kakaoApiUrl = "https://kapi.kakao.com/v2/user/me";
  const response: AxiosResponse<KakaoUser> = await axios.get(kakaoApiUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  console.log(response.data);
  if (response.data && response.data.id) {
    return {
      uid: `kakao:${response.data.id}`,
      ...response.data,
    };
  } else {
    throw new Error("Invalid Kakao Access token");
  }
}
