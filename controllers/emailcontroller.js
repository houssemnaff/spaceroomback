const nodemailer = require("nodemailer");

const sendEmail = async ({ from, to, subject, text, html }) => {
    try {
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: "spaceroomplatform@gmail.com", // Remplace par ton email
                pass: "hjux ksma zelh wwsu", // Remplace par ton mot de passe d'application
            },
        });

        const message = {
            from,
            to,
            subject,
            text,
            html,
        };

        const info = await transporter.sendMail(message);
        console.log("Mail envoyé: " + info.response);
        return info;
    } catch (error) {
        console.error("Erreur lors de l'envoi de l'email:", error);
        throw error;
    }
};

// Permet d'exporter la fonction si elle doit être utilisée ailleurs
module.exports = sendEmail;

// Tester l'envoi de l'email directement si ce fichier est exécuté
if (require.main === module) {
    sendEmail({
        from: "spaceroomplatform@gmail.com",
        to: "2f385f8c2d@emaily.pro",
        subject: "Test Email",
        text: "Ceci est un test",
        html: "<h1>Ceci est un test</h1>",
    }).then(() => console.log("Email envoyé avec succès"))
      .catch(err => console.error("Erreur:", err));
}
