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
    const verify = async (batterys = batteryNoListStr.split('\n').filter(Boolean), groupNum: number = 4) => {
        // 对batteryList进行分组，4个为一组
        // const batterys = batteryNoListStr.split('\n').filter(Boolean)

        const dcbhurlList = []

        for (let i = 0; i < batterys.length; i += groupNum) {
            const group = batterys.slice(i, i + groupNum)
            dcbhurlList.push(group)
            // dcbhurlList.push(group.join('|'))
        }

        console.log(dcbhurlList, 'dcbhurlList');

        const resultList = []
        for (const dcbhurl of dcbhurlList) {
            const resolve = new Promise(async (resolve) => {

                const response = await fetch('/api/verifyBattery', {
                    method: 'POST',
                    body: JSON.stringify({
                        token,
                        dcbhurl: dcbhurl.map(item => `https://www.pzcode.cn/pwb/${item}`).join("|"),
                        cjhurl: getCjhUrl(),
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
                const result = await response.json()

                await delay(1000)

                if (result.code === 0) {
                    if (dcbhurl.length > 1) {
                        console.log(dcbhurl, '<==dcbhurl');
                        resolve(await verify(dcbhurl, 1))
                    }
                    resolve(dcbhurl.join('|'))
                }
                resolve('')
            })
            resultList.push(await resolve)
        }
        const array = resultList.filter(Boolean).map(it => ({ value: it })) as Array<ValidBatteryListItem>
        setValidBattery(array)
        console.log(array, '<===resultList');
        await invoke('my_generate_excel_command', {
            tableData: {
                data: array,
                columns
            }
        });
    }

    function getCjhUrl() {
        const carNums = carNumListStr.split('\n').filter(Boolean)
        // 随机取
        const randomCarNum = carNums[Math.floor(Math.random() * carNums.length)]
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
        console.log(cardInfoList, 'cardInfoList')
        const str = cardInfoList.map(it => it.value).join('\n')
        setCarNumListStr(str)
    }

    const autoSyncBatteryNo = async () => {
        const str = batteryList.map(it => it.value).join('\n')
        setBatteryNoListStr(str)
    }

    const importBatteryNo = async () => {
        const dataJson = await getFileText()
        const text = (dataJson as Array<{ '电池码': string }>).map(it => it['电池码']).join('\n')

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
                    extensions: ['txt', 'xlsx'],
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
        <Stack spacing={2}>
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
                onClick={() => verify()}
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
