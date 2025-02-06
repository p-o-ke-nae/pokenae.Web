"use client";

import MyApp from "../../pokenae.WebComponent/src/pages/_app";
import { default as Collection } from "./Collection";

export default function Home() {
  const clickHandler = () => {
    
  };
  return (
    <MyApp Component={Collection} pageProps={{}}>
    </MyApp>
  );
}
