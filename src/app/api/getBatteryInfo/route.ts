import { NextResponse } from "next/server"

export const POST = async function (req: Request) {
    const { token, dcbhurl } = await req.json()
    const response = await fetch(`
    https://jgjfjdcgl.gat.zj.gov.cn:5102/inf_zpm/hz_mysql_api/BatteryBinding/dcinfoquery?token=${token}&dcbhurl=${dcbhurl}
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

    return NextResponse.json({ ...data, url: `https://jgjfjdcgl.gat.zj.gov.cn:5102/inf_zpm/hz_mysql_api/BatteryBinding/dcinfoquery?token=${token}&dcbhurl=${dcbhurl}` }, { status: 200 })
}