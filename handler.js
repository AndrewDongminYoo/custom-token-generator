const axios = require("axios");
const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

exports.hello = async (event) => {
  const { id_token } = JSON.parse(event.body);

  try {
    // Kakao ID token 검증
    const kakaoUser = await verifyKakaoIdToken(id_token);

    // Firebase 커스텀 토큰 생성
    const firebaseToken = await admin.auth().createCustomToken(kakaoUser.uid);

    return {
      statusCode: 200,
      body: JSON.stringify({ firebaseToken }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

async function verifyKakaoIdToken(idToken) {
  const kakaoApiUrl = "https://kapi.kakao.com/v2/user/me";
  const response = await axios.get(kakaoApiUrl, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (response.data && response.data.id) {
    return {
      uid: `kakao:${response.data.id}`,
      ...response.data,
    };
  } else {
    throw new Error("Invalid Kakao ID token");
  }
}
