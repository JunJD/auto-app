import { fetch as tauriFetch, Body, ResponseType } from "@tauri-apps/api/http";

const apiMatchingClients = [
    { origin: '/api/login', url: 'https://api.matchingclients.com' },
]

export const loginHandler = async (url: RequestInfo, options?: Record<string, unknown>,) => {

    const payload = options?.body || options?.data;
    const { usercode, password } = payload as any;

    try {
        const res = await tauriFetch(`https://jgjfjdcgl.gat.zj.gov.cn:5102/inf_zpm/hz_mysql_api/BatteryBinding/login?usercode=${usercode}&password=${password}&city=0573`, {
            ...options,
            Headers: {
                authority: 'jgjfjdcgl.gat.zj.gov.cn:5102',
                scheme: 'https',
                // 注意：在 Tauri 的 fetch 中，你需要根据实际情况调整 headers 的设置
                'Accept-Encoding': 'gzip',
                'User-Agent': 'okhttp/4.9.3'
            },
            responseType:
                options?.responseType == "text" ? ResponseType.Text : ResponseType.JSON,
        } as any);

        console.log('res', res)
    } catch (error) {
        console.log('error', error)
    }

    return res
    // const data = await response.json();
    // res.status(200).json({ ...data });
}