import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  turbopack: { root: process.cwd() },
  async rewrites(){return {beforeFiles:[
    {source:"/",has:[{type:"host",value:"ecomitra.harshit.page"}],destination:"/quiz"},
  ]}},
  async headers(){return [
    {source:"/:path*",headers:[
      {key:"X-Content-Type-Options",value:"nosniff"},
      {key:"X-Frame-Options",value:"DENY"},
      {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
      {key:"Permissions-Policy",value:"camera=(self), geolocation=(self), microphone=()"},
      {key:"Content-Security-Policy",value:"object-src 'none'; base-uri 'self'; frame-ancestors 'none'"},
    ]},
    {source:"/api/:path*",headers:[{key:"Cache-Control",value:"private, no-store"}]},
  ]},
};
export default config;
