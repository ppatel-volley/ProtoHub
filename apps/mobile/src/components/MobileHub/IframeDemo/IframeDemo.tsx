import "./IframeDemo.css"

import type { ChangeEvent } from "react"
import { useState } from "react"

import packageJson from "../../../../package.json"
// TODO: Update this import path if Playground exists in the hub repository

export const IframeDemo = (): React.ReactElement => {
    const [url, setUrl] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isValidUrl, setIsValidUrl] = useState(true)
    const validateUrl = (url: string): boolean => {
        try {
            new URL(url)
            return true
        } catch {
            return false
        }
    }

    const handleIframeLoad = (): void => {
        setIsLoading(false)
    }

    const handleUrlChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const newUrl = e.target.value
        setUrl(newUrl)
        if (newUrl === "") {
            setIsValidUrl(true)
            return
        }
        setIsValidUrl(validateUrl(newUrl))
        setIsLoading(true)
    }

    return (
        <div className="container">
            <div className="input-wrapper">
                <input
                    type="url"
                    value={url}
                    onChange={handleUrlChange}
                    placeholder="Enter URL to display"
                    className={`url-input ${!isValidUrl ? "invalid" : ""}`}
                />
                {!isValidUrl && url !== "" && (
                    <div className="validation-error">
                        Please enter a valid URL
                    </div>
                )}
            </div>
            {url && isValidUrl ? (
                <div className="iframe-wrapper">
                    {isLoading && <div className="loading">Loading...</div>}
                    <iframe
                        src={url}
                        title="URL Content"
                        className="content-frame"
                        onLoad={handleIframeLoad}
                    />
                </div>
            ) : null}
            <div className="version">v{packageJson.version}</div>
        </div>
    )
}
