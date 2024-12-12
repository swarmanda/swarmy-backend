export function makeEmailTemplate(title: string, paragraph: string, buttonText: string, buttonUrl: string) {
  return `<div style="font-family: inherit; text-align: center"><span style="font-size: 43px">${title}</span></div>
<div style="font-family: inherit; text-align: center">
  <span style="font-size: 18px; font-family: inherit">${paragraph}</span>
</div>
<td
  align="center"
  bgcolor="#0c9f56"
  class="inner-td"
  style="border-radius: 6px; font-size: 16px; text-align: center; background-color: inherit"
>
  <a
    clicktracking="off"
    href="${buttonUrl}"
    style="
      background-color: #0c9f56;
      border: 1px solid #0c9f56;
      border-color: #0c9f56;
      border-radius: 0px;
      border-width: 1px;
      color: #ffffff;
      display: inline-block;
      font-size: 14px;
      font-weight: normal;
      letter-spacing: 0px;
      line-height: normal;
      padding: 12px 40px 12px 40px;
      text-align: center;
      text-decoration: none;
      border-style: solid;
      font-family: inherit;
    "
    target="_blank">${buttonText}</a>
</td>`;
}
