'use client'
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button/Button";
import Input from "@mui/joy/Input";
import Select from "@mui/joy/Select";
import Option from '@mui/joy/Option';
import Stack from "@mui/joy/Stack";
import FormLabel from '@mui/joy/FormLabel';
import { FormEvent, useContext, useRef, useState } from "react";
import { incrementAlphaNumericString, incrementAlphaString, incrementNumberString } from "@/utils/fetch";
import { AuthContext } from "@/provider/AuthProvider";
import ListTable from "@/components/ListTable";
import { invoke } from '@tauri-apps/api/tauri'
import { BatteryListItem, InfoContext } from "@/provider/InfoProvider";
import { FetchQueue } from '@/utils/FetchQueue';

const columns: any = [
    { key: 'value', label: '电池码' },
    { key: 'battery_type', label: '电池类型' },
    { key: 'bfn_or_oe', label: '电池品牌' },
    { key: 'batteryCapacity', label: '电池容量' },
];
export default function BatteryNo() {
    const [loading, setLoading] = useState(false)
    const { token } = useContext(AuthContext);
    const { batteryList, setBatteryListItem } = useContext(InfoContext)
    const [isGarbled, setIsGarbled] = useState('1');
    const [startComplement, setStartComplement] = useState('0000');
    const [startPosition, setStartPosition] = useState("");
    const [batteryNo, setBatteryNo] = useState('');
    const [errNum, setNumber] = useState(0);
    const cacheData = useRef<BatteryListItem[]>([]);
    const fetchRef = useRef<any>(null);
    const pauseFetchQueueRef = useRef<any>(null);
    const pause = () => {
        pauseFetchQueueRef.current()
        invoke('my_generate_excel_command', {
            tableData: {
                data: cacheData.current,
                columns
            },
            folderNameString: '电池码',
            xlsxFilePathString: '电池码'
        }).finally(() => {
            setLoading(false)
        })
    }
    const handleStartPosition = (value: string) => {
        const num = +value
        // 非数字

        setStartComplement('');
        setBatteryNo(prev => {
            const fixV = prev.replace(/\s/g, '');
            // 计算新的空格
            const newSpace = num;
            if (newSpace <= fixV.length) {
                setStartPosition((num === 0 ? '' : num) + '');
                // 在startPosition位置处补上空格
                const newBatteryNo = fixV.slice(0, newSpace) + ' ' + fixV.slice(newSpace);

                // 返回新的车牌号
                return newBatteryNo;
            } else {
                return prev
            }
        })
    }
    const handleStartComplement = (value: string, _isGarbled = isGarbled) => {
        if (_isGarbled === "1") {
            // 校验是否为纯数字
            const regex = /^\d+$/;
            if (!regex.test(value)) {
                return;
            }
        }

        if (_isGarbled === "2") {
            // 校验是否为纯字母
            const regex = /^[a-zA-Z]+$/;
            if (!regex.test(value)) {
                return;
            }
        }

        if (_isGarbled === "3") {
            // 校验是否为纯字母数字
            const regex = /^[a-zA-Z0-9]+$/;
            if (!regex.test(value)) {
                return;
            }
        }

        setBatteryNo(prev => {
            // 跳过第一个空格并在startComplement.length 位置处补上第二个空格
            const endIndex = prev.indexOf(' ');
            const ennValue = prev.slice(endIndex).replace(/\s/g, '');
            if (ennValue.length >= value.length || ennValue.length === 0) {
                setStartComplement(value);
            }
            let newEndValue = ennValue
            if (endIndex !== -1) {
                const newSpace = value.length
                newEndValue = ennValue.slice(0, newSpace) + ' ' + ennValue.slice(newSpace);
            }

            const newBatteryNo = prev.slice(0, endIndex) + ' ' + newEndValue;

            // 返回新的车牌号
            return newBatteryNo
        })
    }
    const handleSelectChange = (e: any, newValue: string | null) => {
        if (!newValue) return
        setIsGarbled(newValue);
        setTimeout(() => {
            if (newValue === '2') {
                handleStartComplement('aaaa', newValue);
            } else if (newValue === "1") {
                handleStartComplement('0000', newValue);
            }
        });
    };

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setLoading(true)
        setNumber(0)
        const formData = new FormData(event.currentTarget);

        const concurrency = Number(formData.get('concurrency')) as number;

        const fetchQueue = new FetchQueue((isNaN(concurrency) ? 5 : concurrency) * 2);
        fetchRef.current = (input: RequestInfo, init?: RequestInit, priority: number = 0) => {
            return fetchQueue.enqueue((controller) => {
                const config = { ...init, signal: controller.signal };
                return fetch(input, config);
            }, priority);
        }

        pauseFetchQueueRef.current = () => {
            fetchQueue.pause();
        }

        const batteryNo = formData.get('batteryNo') as string;
        const isGarbled = formData.get('isGarbled') as string;
        const startComplement = formData.get('startComplement') as string;
        const startPosition = formData.get('startPosition') as string;
        const exhaustiveQuantity = formData.get('exhaustiveQuantity') as string;

        if (!exhaustiveQuantity) {
            return
        }
        if (!batteryNo) {
            return
        }
        if (!startPosition) {
            return
        }

        let currentString = startComplement;

        setBatteryListItem([])
        const resolveList: Promise<BatteryListItem | null>[] = []

        for (let index = 0; index < Array.from({ length: Number(exhaustiveQuantity) }).fill(0).length; index++) {
            resolveList.push(new Promise(async (resolve) => {
                try {
                    const leftV = batteryNo?.slice(0, Number(startPosition) + 1).replace(/\s/g, '');
                    const rightV = batteryNo?.slice(Number(startPosition) + 1 + startComplement.length).replace(/\s/g, '');
                    switch (isGarbled) {
                        case "1":
                            currentString = incrementNumberString(currentString)
                            break;
                        case "2":
                            currentString = incrementAlphaString(currentString)
                            break;
                        default:
                            currentString = incrementAlphaNumericString(currentString);
                            break;
                    }

                    const item = `${leftV}${currentString}${rightV}`

                    const result = await getBatteryNoFetch(item)
                    if (!result) {
                        setNumber(prev => prev + 1)
                        resolve(null)
                        return
                    }

                    const {
                        dcxh,
                        dclx,
                        dcpp,
                        dcrl
                    } = result

                    const current = {
                        value: item,
                        status: 'success',
                        battery_model: dcxh,
                        battery_type: dclx,
                        bfn_or_oe: dcpp,
                        batteryCapacity: dcrl
                    }

                    setBatteryListItem((prev: BatteryListItem[]) => {
                        return [current, ...prev]
                    })
                    cacheData.current.push(current)
                    resolve(current)
                } catch (error) {
                    resolve(null)
                }
            }))
        }

        cacheData.current = (await Promise.all(resolveList)).filter(Boolean) as BatteryListItem[]

        invoke('my_generate_excel_command', {
            tableData: {
                data: cacheData.current,
                columns
            },
            folderNameString: '电池码',
            xlsxFilePathString: 'batteryNo'
        }).finally(() => {
            setLoading(false)
        })
    }


    async function getBatteryNoFetch(item: string) {
        const response = await fetchRef.current('https://autoappzhouer.dingjunjie.com/api/getBatteryInfo', {
            method: "POST",
            body: JSON.stringify({ token, dcbhurl: `https://www.pzcode.cn/pwb/${item}` }),
        }, 1)
        const result = await response.json()

        if (result.code === 0) {

            const response = await fetchRef.current(`https://www.pzcode.cn/pwb/${item}`, {
                redirect: 'follow',
                // 超时时间
            }, 2)

            const text = await response.text();
            const 销售单位未入库 = text.includes('销售单位未入库')
            const 车辆制造商 = text.includes('车辆制造商')

            console.table({ 销售单位未入库, 车辆制造商 });


            if (销售单位未入库 && !车辆制造商) {
                return result.data
            }
            return null
        }
        return null
    }



    return (
        <Stack spacing={2} height={'100%'}>
            <form
                onSubmit={onSubmit}
            >
                <Stack spacing={1}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <FormLabel>车架号</FormLabel>
                        <Input required name="batteryNo" value={batteryNo}
                            onChange={(e) => {
                                setBatteryNo(e.target.value ?? null)
                                handleStartPosition("")
                                handleStartComplement('')
                            }} sx={{ flex: 1 }} />

                        <FormLabel>并发数</FormLabel>
                        <Input type="number" required name="concurrency" sx={{ flex: 1 }} defaultValue={5} />
                        {/* <FormLabel>品牌号</FormLabel> */}
                        {/* <Input name="carBrand" sx={{ flex: 1 }} /> */}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <FormLabel>开始位置</FormLabel>
                        <Input required name="startPosition" value={startPosition} onChange={(e) => handleStartPosition(e.target.value)} sx={{ flex: 1 }} />
                        <FormLabel>补充码类型</FormLabel>
                        <Select value={isGarbled} onChange={handleSelectChange}>
                            <Option value="1">顺码</Option>
                            <Option value="2">乱码</Option>
                            <Option value="3">随机</Option>
                        </Select>
                        <FormLabel>起始补充码</FormLabel>
                        <Input required name="startComplement" value={startComplement} onChange={(e) => handleStartComplement(e.target.value)} sx={{ flex: 1 }} />
                        <FormLabel>穷举数量</FormLabel>
                        <Input required name="exhaustiveQuantity" sx={{ flex: 1 }} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Button type="submit" loading={loading}>开始运行</Button>
                        <Button onClick={pause} disabled={!loading}>暂停当前运行</Button>
                        <Stack spacing={10} direction='row'>
                            <span>当前有效数量： {batteryList.length}</span>
                            <span>当前无效数量： {errNum}</span>
                        </Stack>
                    </Box>
                </Stack>
            </form>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <ListTable<BatteryListItem> data={batteryList} columns={columns} />
            </Box>
        </Stack>
    )
}