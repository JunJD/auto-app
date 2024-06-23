import { NextResponse } from "next/server"

export const POST = async function (req: Request) {
    const { token, dcbhurl, cjhurl } = await req.json()
    console.log({ token, dcbhurl, cjhurl }, '{ token, dcbhurl, cjhurl }')
    const response = await fetch(`
    https://jgjfjdcgl.gat.zj.gov.cn:5102/inf_zpm/hz_mysql_api/BatteryBinding/checkCjhDc?city=0573&token=${token}&cjhurl=${cjhurl}&dcbhurl=${dcbhurl}
    `, {
        method: "GET",
        headers: {
            authority: 'jgjfjdcgl.gat.zj.gov.cn:5102',
            scheme: 'https',
            'accept-encoding': 'gzip',
            'user-agent': "okhttp/4.9.3"
        }
    })
    const data = await response.json()

    return NextResponse.json({ ...data, url: `/checkCjhDc?dcbhurl=${dcbhurl}&city=0573&token=${token}&cjhurl=${cjhurl}` }, { status: 200 })
}