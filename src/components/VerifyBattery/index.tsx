'use client'
import * as React from 'react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Textarea from '@mui/joy/Textarea';
import Stack from '@mui/joy/Stack';
import { open } from "@tauri-apps/api/dialog"
import { readBinaryFile, readTextFile } from "@tauri-apps/api/fs"
import { AuthContext } from '@/provider/AuthProvider';
import { BatteryListItem, InfoContext } from '@/provider/InfoProvider';
import { delay } from '@/utils/fetch';
import * as xlsx from 'xlsx'
import ListTable from '../ListTable';
import { invoke } from '@tauri-apps/api';
import { pauseFetchQueue, customFetch as fetch, fetchBashUrlList } from '@/utils/FetchQueue';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';

interface ValidBatteryListItem {
    value: string,
    key: string
}

const columns: any = [
    { key: 'value', label: '可使用电池码' },
    { key: 'key', label: '电池品牌-电池容量-电池类型' },
]

function VerifyBattery() {
    const [carNumListStr, setCarNumListStr] = React.useState('')
    const [batteryNoListStr, setBatteryNoListStr] = React.useState('')
    const { token } = React.useContext(AuthContext)
    const { cardInfoList, setCardInfoList, batteryList, setBatteryListItem } = React.useContext(InfoContext)

    const batteryListFilter = React.useMemo(() => {
        return batteryList.filter(it => it.status === 'success')
    }, [batteryList])

    const cardInfoListFilter = React.useMemo(() => {
        return cardInfoList.filter(it => it.status === 'success')
    }, [cardInfoList])

    const [validBattery, setValidBattery] = React.useState<Array<ValidBatteryListItem>>([])
    const [loading, setLoading] = React.useState(false)
    const [batteryMap, setBatteryMap] = React.useState<Map<string, string[]>>(new Map())
    const [carNumMap, setCarNumMap] = React.useState<Map<string, string[]>>(new Map())
    const [errNum, setNumber] = React.useState(0);
    const [errMapping, setErrMapping] = React.useState(0);
    const cacheData = React.useRef<ValidBatteryListItem[]>([]);

    const pauseRef = React.useRef(false);

    const pause = async () => {
        pauseRef.current = true;
        pauseFetchQueue();
        if (cacheData.current.length) {
            invoke('my_generate_excel_command', {
                tableData: {
                    data: cacheData.current,
                    columns
                },
                folderNameString: '可绑电池码',
                xlsxFilePathString: '可绑电池码'
            }).finally(async () => {
                await invoke('my_generate_qrcode_command', {
                    tableData: {
                        data: cacheData.current,
                        columns
                    },
                    folderNameString: '可绑电池码',
                }).finally(() => {
                    setLoading(false)
                })
            })
        } else {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        const splitBatteryArray = batteryNoListStr.split('\n').filter(Boolean)

        if (splitBatteryArray.length > 0) {
            const map = new Map()
            for (const batteryItem of splitBatteryArray) {
                const findInfo = batteryListFilter.find(item => item.value === batteryItem)
                const key = `${findInfo?.bfn_or_oe ?? '未知'}-${findInfo?.batteryCapacity ?? '未知'}-${findInfo?.battery_type ?? '未知'}`
                if (map.has(key)) {
                    map.get(key)?.push(batteryItem)
                } else {
                    map.set(key, [batteryItem])
                }
            }

            setBatteryMap(map)
        }

    }, [batteryNoListStr])

    React.useEffect(() => {
        const splitCarNumArray = carNumListStr.split('\n').filter(Boolean)
        if (splitCarNumArray.length > 0) {
            const map = new Map()
            for (const CarNumItem of splitCarNumArray) {
                const findInfo = cardInfoListFilter.find(item => item.value === CarNumItem)
                const key = `${findInfo?.bfn_or_oe ?? '未知'}-${findInfo?.batteryCapacity ?? '未知'}-${findInfo?.battery_type ?? '未知'}`
                if (map.has(key)) {
                    map.get(key)?.push(CarNumItem)
                } else {
                    map.set(key, [CarNumItem])
                }
            }
            setCarNumMap(map)
        }

    }, [carNumListStr])

    const baseUrlIndex = React.useRef(0)
    function getBaseUrl() {
        if (baseUrlIndex.current >= fetchBashUrlList.length) {
            baseUrlIndex.current = 0
        }
        return fetchBashUrlList[baseUrlIndex.current++]
    }

    const verifyStart = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setValidBattery([])
        const formData = new FormData(event.currentTarget);

        const isFlag = formData.get('isFlag') as string;

        setNumber(0)
        setErrMapping(0)
        setLoading(true)
        cacheData.current = []
        const resolveList: Promise<any>[] = []
        batteryMap.forEach((value, key) => {
            resolveList.push(new Promise(async (resolve) => {

                if (carNumMap.has(key)) {
                    const keyItem = key.split('-')
                    const batteryType = keyItem[2]
                    if (batteryType === '铅酸') {
                        try {
                            resolve(await verifyForQS([...value], [...carNumMap.get(key) ?? [], ...carNumMap.get("未知-未知-未知") ?? []]!, key))
                        } finally {
                            resolve(null)
                        }
                    } else {
                        try {
                            resolve(await verifyForLD([...value], [...carNumMap.get(key) ?? [], ...carNumMap.get("未知-未知-未知") ?? []], key))
                        } finally {
                            resolve(null)
                        }
                    }
                } else if (key === '未知-未知-未知') {
                    // 从 carNumMap 获取所有的车架号
                    const allCarNums = Array.from(carNumMap.values()).flat()
                    if (isFlag === '2') {
                        try {
                            resolve(await verifyForQS([...value], allCarNums, key))
                        } finally {
                            resolve(null)
                        }
                    } else {
                        try {
                            resolve(await verifyForLD([...value], allCarNums, key))
                        } finally {
                            resolve(null)
                        }
                    }
                } else {
                    setErrMapping(prev => prev + value.length)
                    resolve(null)
                }
            }))
        })

        await Promise.all(resolveList)
        if (cacheData.current.length) {

            invoke('my_generate_excel_command', {
                tableData: {
                    data: cacheData.current,
                    columns
                },
                folderNameString: '可绑电池码',
                xlsxFilePathString: '可绑电池码'
            }).finally(async () => {
                await invoke('my_generate_qrcode_command', {
                    tableData: {
                        data: cacheData.current,
                        columns
                    },
                    folderNameString: '可绑电池码',
                }).finally(() => {
                    setLoading(false)
                })
            })
        } else {
            setLoading(false)
        }
    }

    const verifyForQS = async (batterys: BatteryListItem['value'][], carNums: string[], key: string) => {
        // carNums 组成2维数组，四个为一组，最后一组不够的向前面的借
        const groupNum: number = 4
        // const resultList: string[] = []
        const retryLimit = 10; // 设置最大重试次数
        const retryCounts = {} as Record<string, number>; // 用于跟踪每个电池的重试次数
        const dcbhurlList: string[][] = []
        for (let i = 0; i < batterys.length; i += groupNum) {
            const group = batterys.slice(i, i + groupNum)
            if (group.length < groupNum) {
                group.push(...batterys.slice(0, groupNum - group.length))
            }
            dcbhurlList.push(group)
        }
        while (dcbhurlList.length > 0) {
            if (pauseRef.current) {
                pauseRef.current = false
                break
            }
            try {
                const dcbhurl = dcbhurlList.shift()
                if (!dcbhurl) {
                    setNumber(prev => prev + 1)
                    continue
                }
                const baseUrl = getBaseUrl()
                const response = await fetch(`${baseUrl}/api/verifyBattery`, {
                    method: 'POST',
                    body: JSON.stringify({
                        token,
                        dcbhurl: dcbhurl!.map(item => `https://www.pzcode.cn/pwb/${item}`).join("|"),
                        cjhurl: getCjhUrlByCarNums(carNums),
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })

                const result = await response.json()

                await delay(1000)
                if (result.code === 0) {
                    cacheData.current.push(...(dcbhurl.map(it => ({ value: it, key }))))
                    setValidBattery(prev => [...prev, ...dcbhurl.map(it => ({ value: it, key }))].filter((item, index) => {
                        const findIndex = prev.findIndex(prevItem => prevItem.value === item.value)
                        if (findIndex === -1) return true
                        return findIndex === index
                    }))
                } else if (result.msg === '操作频繁，请稍后再试') {
                    if (!retryCounts[dcbhurl.join("|")!]) {
                        retryCounts[dcbhurl.join("|")!] = 0;
                    }
                    retryCounts[dcbhurl.join("|")!]++;

                    if (retryCounts[dcbhurl.join("|")!] < retryLimit) {

                        await delay(1000)
                        dcbhurlList.push(dcbhurl!)
                    } else {
                        setNumber(prev => prev + 1)
                    }

                }
            } catch (error) {
                continue
            }
        }
    }

    const verifyForLD = async (batterys: BatteryListItem['value'][], carNums: string[], key: string) => {
        const retryLimit = 10; // 设置最大重试次数
        const retryCounts = {} as Record<string, number>; // 用于跟踪每个电池的重试次数
        while (batterys.length > 0) {
            if (pauseRef.current) {
                pauseRef.current = false
                break
            }
            try {
                const battery = batterys.shift()
                const redoBattery = validBattery.find(item => item.value === battery)
                if (redoBattery) {
                    setNumber(prev => prev + 1)
                    continue
                }
                const baseUrl = getBaseUrl()
                const response = await fetch(`${baseUrl}/api/verifyBattery`, {
                    method: 'POST',
                    body: JSON.stringify({
                        token,
                        dcbhurl: `https://www.pzcode.cn/pwb/${battery}`,
                        cjhurl: getCjhUrlByCarNums(carNums),
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
                const result = await response.json()
                await delay(1000)
                if (result.code === 0) {
                    cacheData.current.push({ value: battery!, key })
                    setValidBattery(prev => [...prev, { value: battery!, key }].filter((item, index) => {
                        const findIndex = prev.findIndex(prevItem => prevItem.value === item.value)
                        if (findIndex === -1) return true
                        return findIndex === index
                    }))
                } else if (result.msg === '操作频繁，请稍后再试') {

                    if (!retryCounts[battery!]) {
                        retryCounts[battery!] = 0;
                    }
                    retryCounts[battery!]++;

                    if (retryCounts[battery!] < retryLimit) {
                        await delay(1000);
                        batterys.push(battery!);
                    } else {
                        setNumber(prev => prev + 1)
                    }
                }
            } catch (error) {
                continue
            }
        }
    }

    const getCjhUrlByCarNums = (numList: string[]) => {
        // 随机取
        const randomCarNum = numList[Math.floor(Math.random() * numList.length)]
        return `https://www.pzcode.cn/vin/${randomCarNum}`
    }

    const carNumListLength = React.useMemo(() => {
        const carNumList = carNumListStr.split('\n').filter(Boolean)
        return carNumList.length
    }, [carNumListStr])

    const batteryNoListLength = React.useMemo(() => {
        const batteryNoList = batteryNoListStr.split('\n').filter(Boolean)
        return batteryNoList.length
    }, [batteryNoListStr])

    const autoSyncCarNum = async () => {
        const str = cardInfoListFilter.map(it => it.value).join('\n')
        setCarNumListStr(str)
    }

    const autoSyncBatteryNo = async () => {
        const str = batteryListFilter.map(it => it.value).join('\n')
        setBatteryNoListStr(str)
    }

    const importBatteryNo = async () => {
        let text = ''
        try {
            const dataJson = await getFileText() as Array<{ '电池码': string, '电池品牌': string, 电池容量: string, 电池类型: string }>
            const data = dataJson.map(item => ({
                value: item.电池码,
                status: 'success',
                battery_type: item.电池类型,
                bfn_or_oe: item.电池品牌,
                batteryCapacity: item.电池容量,
            }))
            setBatteryListItem(data)
            text = (dataJson as Array<{ '电池码': string }>).map(it => it['电池码']).join('\n')
        } catch (error) {

        }
        setBatteryNoListStr(text)
    }
    const importCarNum = async () => {
        let text = ''
        try {
            const dataJson = await getFileText() as Array<{ '车架号': string, '电池品牌': string, 电池容量: string, 电池类型: string }>
            const carData = dataJson.map(item => ({
                value: item.车架号,
                status: 'success',
                battery_type: item.电池类型,
                bfn_or_oe: item.电池品牌,
                batteryCapacity: item.电池容量,
            }))
            setCardInfoList(carData)
            text = (dataJson as Array<{ '车架号': string }>).map(it => it['车架号']).join('\n')
        } catch (error) {

        }
        setCarNumListStr(text)
    }

    async function getFileText() {
        let filePath = await open({
            filters: [
                {
                    name: 'txt',
                    extensions: ['xlsx'],
                },
            ],
            multiple: false,
        })
        if (!filePath) return ''

        const data = new Uint8Array(await readBinaryFile(filePath as string))

        const workbook = xlsx.read(data, { type: 'array' });

        // 假设你想读取第一个工作表的数据
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = xlsx.utils.sheet_to_json(worksheet);
        return jsonData
    }

    async function handleCarNumListStr(value: string) {
        // const list = value.split('\n').filter(Boolean)

        // const _list = list.filter(it => {
        //     return !cardInfoListFilter.some(item => item.value === it)
        // })

        setCarNumListStr(value)

        // const reoslves = (await Promise.all(_list.map(async (item) => {
        //     const response = await fetch('https://autoappzhouer.dingjunjie.com/api/getCarNum', {
        //         method: "POST",
        //         body: JSON.stringify({ token, cjhurl: `https://www.pzcode.cn/vin/${item}` }),
        //     }, 1)
        //     const result = await response.json()
        //     return { ...result, value: item }
        // }))).filter(res => res.code === 0).map(it => ({
        //     value: it.value,
        //     status: 'success',
        //     // batteryModel: dcxh,
        //     battery_type: it.data.dclx,
        //     bfn_or_oe: it.data.dcpp,
        //     brand: it.data.zwpp,
        //     batteryCapacity: it.data.dcrl,
        //     battery_num: it.data.batteryNum,
        // }))
        // if (reoslves.length) {
        //     setCardInfoList((prev) => {
        //         return [
        //             ...prev,
        //             ...reoslves
        //         ]
        //     })
        //     setCarNumListStr(value)
        // }
    }

    return (
        <Stack spacing={2} sx={{ width: '100%', height: '100%', overflow: 'hidden' }}>
            <form onSubmit={verifyStart}>
                <Stack direction="row" spacing={2}>
                    <FormControl sx={{ flex: '1' }}>
                        <FormLabel>
                            车架号
                            {`【${Array.from(carNumMap.keys())}】`}
                        </FormLabel>
                        <Textarea
                            placeholder="直接填写车架号或者导入车架号txt文件"
                            minRows={3}
                            maxRows={10}
                            value={carNumListStr}
                            onChange={(e) => handleCarNumListStr(e.target.value)}
                            endDecorator={
                                <Box
                                    sx={{
                                        display: 'flex',
                                        gap: 'var(--Textarea-paddingBlock)',
                                        pt: 'var(--Textarea-paddingBlock)',
                                        borderTop: '1px solid',
                                        borderColor: 'divider',
                                        flex: 'auto',
                                    }}
                                >
                                    {`当前有：${carNumListLength}个`}
                                    {cardInfoListFilter.length && <Button sx={{ ml: 'auto' }} onClick={autoSyncCarNum}>自动获取车架号</Button>}
                                    <Button sx={{ ml: 'auto' }} onClick={importCarNum}>
                                        <label htmlFor="file-upload">
                                            导入车架号
                                        </label>
                                    </Button>
                                </Box>
                            }
                        />
                    </FormControl>
                    <FormControl sx={{ flex: '1' }}>
                        <FormLabel>
                            电池码
                            {`【${Array.from(batteryMap.keys())}】`}
                        </FormLabel>
                        <Textarea
                            placeholder="直接填写电池码或者导入电池码txt文件"
                            minRows={3}
                            maxRows={10}
                            value={batteryNoListStr}
                            onChange={(e) => setBatteryNoListStr(e.target.value)}
                            endDecorator={
                                <Box
                                    sx={{
                                        display: 'flex',
                                        gap: 'var(--Textarea-paddingBlock)',
                                        pt: 'var(--Textarea-paddingBlock)',
                                        borderTop: '1px solid',
                                        borderColor: 'divider',
                                        flex: 'auto',
                                    }}
                                >
                                    {`当前有：${batteryNoListLength}个`}
                                    {batteryListFilter.length && <Button sx={{ ml: 'auto' }} onClick={autoSyncBatteryNo}>自动获取电池码</Button>}
                                    <Button sx={{ ml: 'auto' }} onClick={importBatteryNo}>
                                        <label htmlFor="file-upload">
                                            导入电池码
                                        </label>
                                    </Button>
                                </Box>
                            }
                            sx={{
                                minWidth: 300,
                            }}
                        />
                    </FormControl>
                </Stack>

                <Stack spacing={1} direction="row" sx={{ pt: 2 }}>
                    <Select name="isFlag" sx={{ flex: 1 }} defaultValue={'1'}>
                        <Option value="1">非铅酸</Option>
                        <Option value="2">铅酸</Option>
                    </Select>

                    <Button
                        sx={{
                            mt: 2,
                            flex: 1
                        }}
                        disabled={!carNumListStr || !batteryNoListStr}
                        color="primary"
                        type='submit'
                        loading={loading}
                    >验证</Button>
                    <Button onClick={pause} disabled={!loading}>暂停当前运行</Button>
                    <Stack spacing={10} direction='row'>
                        <span>当前有效数量： {validBattery.length}</span>
                        <span>当前无效数量： {errNum}</span>
                        <span>当前未匹配数量： {errMapping}</span>
                    </Stack>
                </Stack>
            </form>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <ListTable<ValidBatteryListItem> data={validBattery} columns={columns} />
            </Box>
        </Stack>
    );
}
export default VerifyBattery;
