import { toCanvas } from "html-to-image";
/** Export the actual designed gift, without phone, name or redemption code. */
export async function ticketImage(node: HTMLElement): Promise<File> {
  await document.fonts.ready;
  const images=Array.from(node.querySelectorAll("img"));
  await Promise.all(images.map(img=>img.decode()));
  const canvas=await toCanvas(node,{pixelRatio:2,backgroundColor:"#262F74",cacheBust:false});
  // WebKit can omit HTML images inside SVG foreignObject. Paint the already
  // decoded, same-origin assets at their actual layout positions on the canvas.
  const context=canvas.getContext("2d");
  if(!context)throw new Error("Gift canvas unavailable");
  const root=node.getBoundingClientRect(),scale=canvas.width/root.width;
  for(const img of images){
    const bounds=img.getBoundingClientRect();
    context.drawImage(img,(bounds.left-root.left)*scale,(bounds.top-root.top)*scale,bounds.width*scale,bounds.height*scale);
  }
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/png"));
  if(!blob)throw new Error("Gift image could not be rendered");
  return new File([blob],"shikho-my-gift.png",{type:"image/png"});
}
