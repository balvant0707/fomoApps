// import { useState } from "react";
// import { Form, useActionData, useLoaderData } from "@remix-run/react";
// import {
//   AppProvider as PolarisAppProvider,
//   Button,
//   Card,
//   FormLayout,
//   Page,
//   Text,
//   TextField,
// } from "@shopify/polaris";
// import polarisTranslations from "@shopify/polaris/locales/en.json";
// import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
// import { login } from "../../shopify.server";
// import { loginErrorMessage } from "./error.server";

// export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

// export const loader = async ({ request }) => {
//   const errors = loginErrorMessage(await login(request));

//   return { errors, polarisTranslations };
// };

// export const action = async ({ request }) => {
//   const errors = loginErrorMessage(await login(request));

//   return {
//     errors,
//   };
// };

// export default function Auth() {
//   const loaderData = useLoaderData();
//   const actionData = useActionData();
//   const [shop, setShop] = useState("");
//   const { errors } = actionData || loaderData;

//   return (
//     <PolarisAppProvider i18n={loaderData.polarisTranslations}>
//       <Page>
//         <Card>
//           <Form method="post">
//             <FormLayout>
//               <Text variant="headingMd" as="h2">
//                 Log in
//               </Text>
//               <TextField
//                 type="text"
//                 name="shop"
//                 label="Shop domain"
//                 helpText="example.myshopify.com"
//                 value={shop}
//                 onChange={setShop}
//                 autoComplete="on"
//                 error={errors.shop}
//               />
//               <Button submit>Log in</Button>
//             </FormLayout>
//           </Form>
//         </Card>
//       </Page>
//     </PolarisAppProvider>
//   );
// }
// app/routes/auth.login/route.jsx
import { authenticate } from "../../shopify.server";

// Loader: Shopify helper redirect use કરો જેથી context (host, shop) preserve રહે
export const loader = async ({ request }) => {
  const { redirect, session } = await authenticate.admin(request);

  // Log auth result for debugging redirect loop
  console.log('Auth result in /auth.login loader:', {
    hasSession: !!session,
    shop: session?.shop || null,
    url: request.url
  });

  return redirect("/app"); // /app index loader first-time /app/theme-embed પર મોકલી દેશે
};

// (optional safety) જો POST થઈ જાય તો પણ એ જ રીતે redirect કરો
export const action = async ({ request }) => {
  const { redirect, session } = await authenticate.admin(request);

  // Log auth result for debugging redirect loop
  console.log('Auth result in /auth.login action:', {
    hasSession: !!session,
    shop: session?.shop || null,
    url: request.url
  });

  return redirect("/app");
};

export default function AuthLogin() {
  return null; // કોઈ UI નહીં
}
