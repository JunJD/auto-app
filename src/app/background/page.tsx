'use client'
import * as React from 'react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Table from '@mui/joy/Table';
import Typography from '@mui/joy/Typography';
import Sheet from '@mui/joy/Sheet';
import Switch from '@mui/joy/Switch';
import * as CryptoJS from 'crypto'

interface Row {
  deviceId: string;
  enabled: boolean;
}
async function createData(deviceId: string, enabled: boolean) {
  const response = await fetch('http://autonginx1.dingjunjie.com/api/devices', {
    method: "POST",
    body: JSON.stringify({ deviceId: deviceId, enabled: enabled }),
    headers: {
      'Content-Type': 'application/json'
    }
  })
  const result = await response.json()
  if (result.code === 0) {
    return result.devices;
  }
  // return { deviceId, enabled };
  return null;
}
async function updateData(deviceId: string, enabled: boolean) {
  const response = await fetch('http://autonginx1.dingjunjie.com/api/devices', {
    method: "PUT",
    body: JSON.stringify({ deviceId: deviceId, enabled: enabled }),
    headers: {
      'Content-Type': 'application/json'
    }
  })
  const result = await response.json()
  if (result.code === 0) {
    return result.devices;
  }
  return null;
}
async function getData() {
  const response = await fetch('http://autonginx1.dingjunjie.com/api/devices', {
    method: "GET"
  })
  const result = await response.json()
  if (result.code === 0) {
    return result.devices;
  } 
  return []
}

export default function TableColumnPinning() {
  const [rows, setRows] = React.useState<Row[]>([]);

  React.useEffect(()=>{
    getDataByNone()
  }, [])
  
  async function getDataByNone () {
    const rows = await getData()
    setRows(rows)
  }

  function setChecked(enabled: boolean, deviceId: string) {
    updateStatusByCode(deviceId, enabled)
  }

  async function generateUsableCode() {
    // 获取本地ip
    const ip = window.location.hostname;
    // 生成16位随机数
    const random = Math.floor(Math.random() * 10000000000000000);
    const md5Hash = CryptoJS.createHash('md5').update(ip + '_' + random).digest('hex');
    const rows = await createData(md5Hash, true)
    if(rows){
      setRows(rows)
    }
  }

  async function updateStatusByCode(deviceId: string, enabled: boolean) {
    const rows = await updateData(deviceId, enabled)
    if(rows){
      setRows(rows)
    }
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Typography level="body-sm" textAlign="center" sx={{ pb: 2 }}>
        ← 管理后台 →
      </Typography>
      <Button onClick={generateUsableCode}>生成可用码</Button>
      <Sheet
        variant="outlined"
        sx={{
          '--TableCell-height': '40px',
          // the number is the amount of the header rows.
          '--TableHeader-height': 'calc(1 * var(--TableCell-height))',
          '--Table-firstColumnWidth': '80px',
          '--Table-lastColumnWidth': '144px',
          // background needs to have transparency to show the scrolling shadows
          '--TableRow-stripeBackground': 'rgba(0 0 0 / 0.04)',
          '--TableRow-hoverBackground': 'rgba(0 0 0 / 0.08)',
          overflow: 'auto',
          background: (theme) =>
            `linear-gradient(to right, ${theme.vars.palette.background.surface} 30%, rgba(255, 255, 255, 0)),
            linear-gradient(to right, rgba(255, 255, 255, 0), ${theme.vars.palette.background.surface} 70%) 0 100%,
            radial-gradient(
              farthest-side at 0 50%,
              rgba(0, 0, 0, 0.12),
              rgba(0, 0, 0, 0)
            ),
            radial-gradient(
                farthest-side at 100% 50%,
                rgba(0, 0, 0, 0.12),
                rgba(0, 0, 0, 0)
              )
              0 100%`,
          backgroundSize:
            '40px calc(100% - var(--TableCell-height)), 40px calc(100% - var(--TableCell-height)), 14px calc(100% - var(--TableCell-height)), 14px calc(100% - var(--TableCell-height))',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'local, local, scroll, scroll',
          backgroundPosition:
            'var(--Table-firstColumnWidth) var(--TableCell-height), calc(100% - var(--Table-lastColumnWidth)) var(--TableCell-height), var(--Table-firstColumnWidth) var(--TableCell-height), calc(100% - var(--Table-lastColumnWidth)) var(--TableCell-height)',
          backgroundColor: 'background.surface',
        }}
      >
        <Table
          borderAxis="bothBetween"
          stripe="odd"
          hoverRow
          sx={{
            '& tr > *:first-child': {
              position: 'sticky',
              left: 0,
              boxShadow: '1px 0 var(--TableCell-borderColor)',
              bgcolor: 'background.surface',
            },
            '& tr > *:last-child': {
              position: 'sticky',
              right: 0,
              bgcolor: 'var(--TableCell-headBackground)',
            },
          }}
        >
          <thead>
            <tr>
              <th style={{ width: 'var(--Table-firstColumnWidth)' }}>行号</th>
              <th style={{ width: 200 }}>设备号</th>
              <th style={{ width: 200 }}>启用状态</th>
              <th
                aria-label="last"
                style={{ width: 'var(--Table-lastColumnWidth)' }}
              />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.deviceId}>
                <td>{index + 1}</td>
                <td>{row.deviceId}</td>
                <td>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Switch
                      checked={row.enabled}
                      onChange={(event) => setChecked(event.target.checked, row.deviceId)}
                    />
                  </Box>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Sheet>
    </Box>
  );
}