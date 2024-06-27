import * as React from 'react'
import { ButtonGroup } from 'azure-devops-ui/ButtonGroup'
import { Button } from 'azure-devops-ui/Button'

export type WebReportTab = {
  url: string
  tabName: string
}

export type WebReportProps = {
  tabs: WebReportTab[]
}

type TabButtonProps = {
  text: string
  isActive: boolean
  onClick: () => void
}

const TabButton: React.FC<TabButtonProps> = ({ text, isActive, onClick }) => {
  return (
    <Button
      text={text}
      onClick={onClick}
      style={{
        borderTop: isActive ? '2px solid rgba(0, 120, 212, 1)' : undefined,
        fontFamily: 'Segoe UI',
      }}
    />
  )
}

export const WebReport: React.FC<WebReportProps> = ({ tabs }) => {
  const [activeTab, setActiveTab] = React.useState<string>(tabs[0]?.tabName)
  const defaultUrl = tabs.find((t) => t.tabName === activeTab)?.url
  return (
    <div
      style={{
        height: '100%',
        paddingTop: '10px',
      }}
    >
      <ButtonGroup className="flex-wrap">
        {tabs.map(({ tabName, url }) => (
          <TabButton
            key={tabName}
            text={tabName}
            isActive={tabName === activeTab}
            onClick={() => {
              setActiveTab(tabName)
              document.getElementById('frame')?.setAttribute('src', url)
            }}
          />
        ))}
      </ButtonGroup>
      {defaultUrl && <iframe id="frame" title="Web Report" src={defaultUrl} />}
    </div>
  )
}
