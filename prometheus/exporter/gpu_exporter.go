// Copyright (c) Microsoft Corporation
// All rights reserved.
//
// MIT License
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
// documentation files (the "Software"), to deal in the Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
// to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
// BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
package main

import (
    "flag"
    "encoding/xml"
    "os/exec"
    "log"
    "os"
    "regexp"
    "fmt"
    "time"
)



var NVIDIA_SMI_PATH string;

type NvidiaSmiLog struct {
    DriverVersion string `xml:"driver_version"`
    AttachedGPUs string `xml:"attached_gpus"`
    GPUs []struct {
        ProductName string `xml:"product_name"`
        ProductBrand string `xml:"product_brand"`
        MinorNumber string `xml:"minor_number"`        
        UUID string `xml:"uuid"`
        FanSpeed string `xml:"fan_speed"`
        PCI struct {
            PCIBus string `xml:"pci_bus"`
        } `xml:"pci"`
        FbMemoryUsage struct {
            Total string `xml:"total"`
            Used string `xml:"used"`
            Free string `xml:"free"`
        } `xml:"fb_memory_usage"`
        Utilization struct {
            GPUUtil string `xml:"gpu_util"`
            MemoryUtil string `xml:"memory_util"`
        } `xml:"utilization"`
        Temperature struct {
            GPUTemp string `xml:"gpu_temp"`
            GPUTempMaxThreshold string `xml:"gpu_temp_max_threshold"`
            GPUTempSlowThreshold string `xml:"gpu_temp_slow_threshold"`
        } `xml:"temperature"`
        PowerReadings struct {
            PowerDraw string `xml:"power_draw"`
            PowerLimit string `xml:"power_limit"`
        } `xml:"power_readings"`
        Clocks struct {
            GraphicsClock string `xml:"graphics_clock"`
            SmClock string `xml:"sm_clock"`
            MemClock string `xml:"mem_clock"`
            VideoClock string `xml:"video_clock"`
        } `xml:"clocks"`
        MaxClocks struct {
            GraphicsClock string `xml:"graphics_clock"`
            SmClock string `xml:"sm_clock"`
            MemClock string `xml:"mem_clock"`
            VideoClock string `xml:"video_clock"`
        } `xml:"max_clocks"`
    } `xml:"gpu"`
}

func formatValue(key string, meta string, value string) string {
    result := key;
    if (meta != "") {
        result += "{" + meta + "}";
    }
    return result + " " + value +"\n"
}

func filterNumber(value string) string {
    r := regexp.MustCompile("[^0-9.]")
    return r.ReplaceAllString(value, "")
}


func writeFileTest() {
    fileName := "test.dat"
    dstFile,err := os.Create(fileName)
    if err!=nil{
        fmt.Println(err.Error())   
        return
    }  
    defer dstFile.Close()
    s:="hello world1 "
    dstFile.WriteString(s + "\n")
}

func writeMetricsToFile(logDir string) {
    fileName := logDir + "/gpu_exporter.prom"
    dstFile,err := os.Create(fileName)
    if err!=nil{
        fmt.Println(err.Error())
        return
    }
    defer dstFile.Close()
    var cmd *exec.Cmd            
    
    cmd = exec.Command(NVIDIA_SMI_PATH, "-q", "-x")
    // Execute system command
    stdout, err := cmd.Output()
    if err != nil {
        println(err.Error())
        return
    }

    // Parse XML
    var xmlData NvidiaSmiLog
    xml.Unmarshal(stdout, &xmlData)

    // Output
    dstFile.WriteString(formatValue("nvidiasmi_driver_version", "", xmlData.DriverVersion))
    dstFile.WriteString(formatValue("nvidiasmi_attached_gpus", "", filterNumber(xmlData.AttachedGPUs)))

    for _, GPU := range xmlData.GPUs {
        dstFile.WriteString(formatValue("nvidiasmi_memory_usage_total", "minor_number=\"" + GPU.MinorNumber + "\"", filterNumber(GPU.FbMemoryUsage.Total)))
        dstFile.WriteString(formatValue("nvidiasmi_memory_usage_used", "minor_number=\"" + GPU.MinorNumber + "\"", filterNumber(GPU.FbMemoryUsage.Used)))
        dstFile.WriteString(formatValue("nvidiasmi_memory_usage_free", "minor_number=\"" + GPU.MinorNumber + "\"", filterNumber(GPU.FbMemoryUsage.Free)))
        dstFile.WriteString(formatValue("nvidiasmi_utilization_gpu", "minor_number=\"" + GPU.MinorNumber + "\"", filterNumber(GPU.Utilization.GPUUtil)))
        dstFile.WriteString(formatValue("nvidiasmi_utilization_memory", "minor_number=\"" + GPU.MinorNumber + "\"", filterNumber(GPU.Utilization.MemoryUtil)))
        dstFile.WriteString(formatValue("nvidiasmi_temp_gpu", "minor_number=\"" + GPU.MinorNumber + "\"", filterNumber(GPU.Temperature.GPUTemp)))
        dstFile.WriteString(formatValue("nvidiasmi_temp_gpu_max", "minor_number=\"" + GPU.MinorNumber + "\"", filterNumber(GPU.Temperature.GPUTempMaxThreshold)))
        dstFile.WriteString(formatValue("nvidiasmi_temp_gpu_slow", "minor_number=\"" + GPU.MinorNumber + "\"", filterNumber(GPU.Temperature.GPUTempSlowThreshold)))
        dstFile.WriteString(formatValue("nvidiasmi_power_draw", "minor_number=\"" + GPU.MinorNumber + "\"", filterNumber(GPU.PowerReadings.PowerDraw)))
        dstFile.WriteString(formatValue("nvidiasmi_power_limit", "minor_number=\"" + GPU.MinorNumber + "\"", filterNumber(GPU.PowerReadings.PowerLimit)))
        dstFile.WriteString(formatValue("nvidiasmi_clock_graphics", "minor_number=\"" + GPU.MinorNumber + "\"", filterNumber(GPU.Clocks.GraphicsClock)))
        dstFile.WriteString(formatValue("nvidiasmi_clock_graphics_max", "minor_number=\"" + GPU.MinorNumber + "\"", filterNumber(GPU.MaxClocks.GraphicsClock)))
        dstFile.WriteString(formatValue("nvidiasmi_clock_sm", "minor_number=\"" + GPU.MinorNumber + "\"", filterNumber(GPU.Clocks.SmClock)))
        dstFile.WriteString(formatValue("nvidiasmi_clock_sm_max", "minor_number=\"" + GPU.MinorNumber + "\"", filterNumber(GPU.MaxClocks.SmClock)))
        dstFile.WriteString(formatValue("nvidiasmi_clock_mem", "minor_number=\"" + GPU.MinorNumber + "\"", filterNumber(GPU.Clocks.MemClock)))
        dstFile.WriteString(formatValue("nvidiasmi_clock_mem_max", "minor_number=\"" + GPU.MinorNumber + "\"", filterNumber(GPU.MaxClocks.MemClock)))
        dstFile.WriteString(formatValue("nvidiasmi_clock_video", "minor_number=\"" + GPU.MinorNumber + "\"", filterNumber(GPU.Clocks.VideoClock)))
        dstFile.WriteString(formatValue("nvidiasmi_clock_video_max", "minor_number=\"" + GPU.MinorNumber + "\"", filterNumber(GPU.MaxClocks.VideoClock)))
    }
}

func main() {
    logDir := flag.String("gpu_log_dir", "/datastorage/prometheus", "log written dir")   
    mode := flag.String("flag", "gpu", "gpu server")
    sleepTime := flag.Int("sleepTime", 30, "cmd sleep duration")   
    flag.Parse()
    NVIDIA_SMI_PATH = os.Getenv("NV_DRIVER") + "/bin/nvidia-smi"
    _, err := os.Stat(*logDir)
	  if err == nil || os.IsNotExist(err) {
        os.MkdirAll(*logDir, os.ModePerm)        
	  }
    
    fmt.Println("test:", *mode)
    if (*mode == "no") {                
        log.Print("no gpu")   
        return   
    }
 
    for {
        log.Print("gpu_server flag" + *mode)
        writeMetricsToFile(*logDir)
        time.Sleep(time.Duration(*sleepTime) * time.Second)  
    }
}
