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

interface ValidBatteryListItem {
    value: string
}

const columns: any = [
    { key: 'value', label: '电池码' },
]

function VerifyBattery() {
    const [carNumListStr, setCarNumListStr] = React.useState('')
    const [batteryNoListStr, setBatteryNoListStr] = React.useState('')
    const { token } = React.useContext(AuthContext)
    const { cardInfoList, batteryList } = React.useContext(InfoContext)

    const [validBattery, setValidBattery] = React.useState<Array<ValidBatteryListItem>>([])

    const [batteryMap, setBatteryMap] = React.useState<Map<string, string[]>>(new Map())
    const [carNumMap, setCarNumMap] = React.useState<Map<string, string[]>>(new Map())

    React.useEffect(() => {
        const splitBatteryArray = batteryNoListStr.split('\n').filter(Boolean)
        if (splitBatteryArray.length > 0) {
            setBatteryMap((prev) => {
                for (const batteryItem of splitBatteryArray) {
                    const findInfo = batteryList.find(item => item.value === batteryItem)
                    const key = `${findInfo?.bfn_or_oe}-${findInfo?.batteryCapacity}-${findInfo?.battery_type}`
                    if (prev.has(key)) {
                        prev.get(key)?.push(batteryItem)
                    } else {
                        prev.set(key, [batteryItem])
                    }
                }
                return prev
            })
        }

    }, [batteryNoListStr])
    React.useEffect(() => {
        const splitCarNumArray = carNumListStr.split('\n').filter(Boolean)        
        if (splitCarNumArray.length > 0) {
            setCarNumMap((prev) => {
                for (const CarNumItem of splitCarNumArray) {
                    const findInfo = cardInfoList.find(item => item.value === CarNumItem)
                    const key = `${findInfo?.bfn_or_oe}-${findInfo?.batteryCapacity}-${findInfo?.battery_type}`
                    if (prev.has(key)) {
                        prev.get(key)?.push(CarNumItem)
                    } else {
                        prev.set(key, [CarNumItem])
                    }
                }
                return prev
            })
        }

    }, [carNumListStr])

    const verifyStart = async () => {
        console.log(batteryMap, 'batteryMap')
        console.log(carNumMap, 'carNumMap')

        batteryMap.forEach((value, key) => {
            if(carNumMap.has(key)) {
                const keyItem = key.split('-')
                const batteryType = keyItem[2]

                if(batteryType==='铅酸') {
                    verifyForQS(value, carNumMap.get(key)!)
                } else {
                    verifyForLD(value, carNumMap.get(key)!)
                }
            } else {
                console.error('not has');
            }
        })
        // await invoke('my_generate_excel_command', {
        //     tableData: {
        //         data: array,
        //         columns
        //     }
        // });
    }

    const verifyForQS = async (batterys: BatteryListItem['value'][], carNums: string[]) => {
        // carNums 组成2维数组，四个为一组，最后一组不够的向前面的借
        const groupNum: number = 4
        const resultList: string[][] = []
        
        const dcbhurlList: string[][] = []

        for (let i = 0; i < batterys.length; i += groupNum) {
            const group = batterys.slice(i, i + groupNum)
            dcbhurlList.push(group)
        }

        while (dcbhurlList.length > 0) {
            const batterys = dcbhurlList.shift()
            if(!batterys) break
            const response = await fetch('/api/verifyBattery', {
                method: 'POST',
                body: JSON.stringify({
                    token,
                    dcbhurl: batterys!.map(item => `https://www.pzcode.cn/pwb/${item}`).join("|"),
                    cjhurl: getCjhUrlByCarNums(carNums),
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            
            const result = await response.json()

            await delay(1000)

            if (result.code === 0) {
                resultList.push(batterys)
                setValidBattery(prev=>[...prev, { value: batterys.join("|") }])
            } else if(result.msg==='操作频繁，请稍后再试') {
                await delay(1000)
                dcbhurlList.push(batterys!)
            }
        }
        
        return resultList
    }

    const verifyForLD = async (batterys: BatteryListItem['value'][], carNums: string[]) => {
        const resultList = []
        
        while (batterys.length > 0) {
            const battery = batterys.shift()
            const response = await fetch('/api/verifyBattery', {
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
            console.log(result.msg, 'result.msg');
            
            if (result.code === 0) {
                resultList.push(battery)
                setValidBattery(prev=>[...prev, { value: battery! }])
            } else if(result.msg==='操作频繁，请稍后再试') {
                await delay(1000)
                batterys.push(battery!)
            }
        }

        return resultList
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
        const str = cardInfoList.map(it => it.value).join('\n')
        setCarNumListStr(str)
    }

    const autoSyncBatteryNo = async () => {
        const str = batteryList.map(it => it.value).join('\n')
        setBatteryNoListStr(str)
    }

    const importBatteryNo = async () => {
        const dataJson = await getFileText()
        let text = ''
        try {
            text = (dataJson as Array<{ '电池码': string }>).map(it => it['电池码']).join('\n')
        } catch (error) {

        }

        setBatteryNoListStr(text)
    }
    const importCarNum = async () => {
        const text = await getFileText()
        // setCarNumListStr(text)
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
        console.log(jsonData); // 输出表格数据
        return jsonData
    }

    return (
        <Stack spacing={2} sx={{ width: '100%', height: '100%', overflow: 'hidden' }}>
            <form>
                <Stack direction="row" spacing={2}>
                    <FormControl sx={{ flex: '1' }}>
                        <FormLabel>车架号</FormLabel>
                        <Textarea
                            placeholder="直接填写车架号或者导入车架号txt文件"
                            minRows={3}
                            maxRows={10}
                            value={carNumListStr}
                            onChange={(e) => setCarNumListStr(e.target.value)}
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
                                    {cardInfoList.length && <Button sx={{ ml: 'auto' }} onClick={autoSyncCarNum}>自动获取车架号</Button>}
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
                        <FormLabel>电池码</FormLabel>
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
                                    {batteryList.length && <Button sx={{ ml: 'auto' }} onClick={autoSyncBatteryNo}>自动获取电池码</Button>}
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
            </form>
            <Button
                sx={{
                    mt: 'var(--Card-paddingBlock)',
                }}
                onClick={() => verifyStart()}
                disabled={!carNumListStr || !batteryNoListStr}
                fullWidth
                color="primary"
            >验证</Button>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <ListTable<ValidBatteryListItem> data={validBattery} columns={columns} />
            </Box>
        </Stack>
    );
}
export default VerifyBattery;
