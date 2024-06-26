import { NextResponse } from "next/server"

export const config = {
    maxDuration: 25,
};

export const POST = async function (req: Request) {

    try {
        if (req.method === "OPTIONS") {
            return NextResponse.next()
        }
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

    } catch (error) {
        return NextResponse.json({ code: 1 }, { status: 200 })
    }

}