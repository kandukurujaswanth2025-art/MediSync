import { useState } from "react";

export function useDbVersion() {
    const [version] = useState(0);

    return version;
}