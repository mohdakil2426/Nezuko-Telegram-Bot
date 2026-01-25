declare module 'react-sparklines' {
    import * as React from 'react';

    export interface SparklinesProps {
        data?: number[];
        limit?: number;
        width?: number;
        height?: number;
        svgWidth?: number;
        svgHeight?: number;
        preserveAspectRatio?: string;
        margin?: number;
        min?: number;
        max?: number;
        style?: React.CSSProperties;
        children?: React.ReactNode;
    }

    export interface SparklinesLineProps {
        color?: string;
        style?: React.CSSProperties;
        onMouseMove?: (event: 'enter' | 'click', value: number, point: { x: number; y: number }) => void;
    }

    export class Sparklines extends React.Component<SparklinesProps> {}
    export class SparklinesLine extends React.Component<SparklinesLineProps> {}
    export class SparklinesBars extends React.Component<any> {}
    export class SparklinesSpots extends React.Component<any> {}
    export class SparklinesReferenceLine extends React.Component<any> {}
    export class SparklinesNormalBand extends React.Component<any> {}
}
