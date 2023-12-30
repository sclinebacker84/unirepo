import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { Box, AppBar, Toolbar, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'

const COLUMNS = [
  {field:'name',flex:1},
  {field:'link',flex:1,renderCell:c => <a href={c.row.link} target="_blank">{c.row.link}</a>}
]

export default function App() {
  const initialLoad = useRef(false)
  const [info,setInfo] = useState({
    git:{}
  })
  const [repos,setRepos] = useState([])

  useEffect(() => {
    if(!initialLoad.current){
      initialLoad.current = true
      axios.get('repos').then(({data}) => setRepos(data))
      axios.get('info').then(({data}) => setInfo(data))
    }
  })

  return <Box sx={{height:400, width:'100%'}}>
    <AppBar position="static">
      <Toolbar>
        <Typography sx={{ flexGrow: 1 }}>{info.git.timestamp}</Typography>
        <Typography sx={{ flexGrow: 1 }}></Typography>
        <Typography sx={{ flexGrow: 1, textAlign: "right" }}>{info.git.hash}</Typography>
      </Toolbar>
    </AppBar>
    <DataGrid rows={repos} columns={COLUMNS} getRowId={row => row.name}></DataGrid>
  </Box>
}