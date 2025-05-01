const dotenv = require("dotenv");
dotenv.config(); // .env ファイルの読み込み

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// デバッグ用（開発時のみ）
console.log(process.env.GMAIL_FOR_SMTP); // 確認用、不要なら削除OK

app.use(cors());
app.use(express.json());

// 保存ファイルのパス
const counterFilePath = path.join(__dirname, 'counter.json');

// 初回サーバー起動時、ファイルがなければ作る
if (!fs.existsSync(counterFilePath)) {
  fs.writeFileSync(counterFilePath, JSON.stringify({ date: getTodayDate(), count: 0 }, null, 2));
}

// メール送信用トランスポート設定
const transporter = nodemailer.createTransport({
    service: 'gmail', // 他にSMTPサービスも可
    auth: {
        user: process.env.GMAIL_FOR_SMTP,
        pass: process.env.GMAIL_PASSWORD_FOR_SMTP, // Gmailの場合はアプリパスワードを使用
    },
});

// 日付を「YYYYMMDD」形式で返す関数
function getTodayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
  
  // 受付番号を発行する関数
  function generateReceptionNumber() {
    const today = getTodayDate();
    let data = JSON.parse(fs.readFileSync(counterFilePath, 'utf8'));
  
    if (data.date === today) {
      data.count += 1;
    } else {
      data.date = today;
      data.count = 1;
    }
  
    fs.writeFileSync(counterFilePath, JSON.stringify(data, null, 2));
    const countStr = String(data.count).padStart(3, '0');
    return `${today}${countStr}`;
  }

app.post('/contact', async (req, res) => {
  const { name, email, phone, post_code, Address_1, Address_2, radio_button, drop_down, checkbox } = req.body;// フォーム入力項目のnameを入れる
  
    // ここでリクエスト内容をログに出す
    console.log("フォーム送信データ:", req.body);

    try {
        const receptionNumber = generateReceptionNumber(); // ここで受付番号を発行

        // 管理者への通知メール
        await transporter.sendMail({
          from: process.env.GMAIL_FOR_SMTP,
          to: process.env.ADMIN_MAIL,
          subject: `ホームページからお問い合わせ【受付番号：${receptionNumber}】`,
          text: 
            `名前　　　　　：${name}\n` +
            `メールアドレス：${email}\n` +
            `電話番号　　　：${phone}\n` +
            `郵便番号　　　：${post_code}\n` +
            `住所　　　　　：${Address_1} ${Address_2}\n` +
            `選択　　　　　：${radio_button}\n` +
            `ドロップダウン：${drop_down}\n` +
            `利用規約同意　：${checkbox}\n`
        });
    
        // ユーザーへの自動返信メール
        await transporter.sendMail({
          from: process.env.GMAIL_FOR_SMTP,
          to: email,
          subject: `【株式会社〇〇HP】お問い合わせいただきありがとうございます【受付番号：${receptionNumber}】`,
          text: 
            `${name}様\n\n` +
            `お問い合わせありがとうございます。\n以下の内容で受け付けました。\n\n` +
            `-\n` +
            `名前　　　　　：${name}\n` +
            `メールアドレス：${email}\n` +
            `電話番号　　　：${phone}\n` +
            `郵便番号　　　：${post_code}\n` +
            `住所　　　　　：${Address_1} ${Address_2}\n` +
            `選択　　　　　：${radio_button}\n` +
            `ドロップダウン：${drop_down}\n` +
            `利用規約同意　：${checkbox}\n` +
            `---\n\n` +
            `・このメールは自動返信メールです。\n・本メールへの返信によるご質問には対応しておりませんので、ご了承下さい。\n\n株式会社〇〇`
        });

        res.status(200).json({ message: '送信完了' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'メール送信に失敗しました。' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});