const admin = require("firebase-admin");
const axios = require("axios");

console.debug(process.env.FIREBASE_SERVICE_ACCOUNT);
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

exports.hello = async (event, context, callback) => {
  // Base64 디코딩
  const decodedString = Buffer.from(event.body, "base64").toString("utf-8");

  console.debug(`Event -> ${decodedString}`);
  const accessToken = decodedString.substring(12);

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
    const customToken = await admin.auth().createCustomToken(kakaoUser.uid);

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

async function verifyKakaoAccessToken(accessToken) {
  const kakaoApiUrl = "https://kapi.kakao.com/v2/user/me";
  const response = await axios.get(kakaoApiUrl, {
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
