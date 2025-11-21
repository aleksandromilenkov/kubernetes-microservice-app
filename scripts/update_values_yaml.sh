#!/bin/bash
set -e

FILE="mymicroserviceapp/values.yaml"

SERVICE=$1
NEW_TAG=$2

# Replace the image tag for the correct service
echo "Updating $SERVICE image tag to $NEW_TAG in $FILE"

sed -i "s#aleksandromilenkov/kub-demo-$SERVICE:.*#aleksandromilenkov/kub-demo-$SERVICE:$NEW_TAG#g" $FILE
