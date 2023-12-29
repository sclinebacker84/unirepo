import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { Box } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'

const COLUMNS = ['name','link'].map((field) => ({field}))

export default function App() {
  const reposLoaded = useRef(false)
  const [repos,setRepos] = useState([])

  useEffect(() => {
    if(!reposLoaded.current){
      reposLoaded.current = true
      axios.get('repos').then(({data}) => setRepos(data))
    }
  })

  return <Box sx={{height:400, width:'100%'}}>
    <DataGrid rows={repos} columns={COLUMNS} getRowId={row => row.name}></DataGrid>
  </Box>
}