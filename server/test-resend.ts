// import { Resend } from "resend";

// const resend = new Resend("");

// async function main() {
//   const response = await resend.emails.send({
//     from: "onboarding@resend.dev",
//     to: "weidson.ac@gmail.com",
//     subject: "Teste",
//     html: "<h1>Hello World</h1>",
//   });

//   console.log(response);
// }

// main().catch(console.error);

async function main() {
  try {
    const response = await fetch("https://api.resend.com");

    console.log(response.status);
    console.log(await response.text());
  } catch (error) {
    console.error(error);
  }
}

main().catch(console.error);
